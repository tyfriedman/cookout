import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

type Body = {
  invitation_id: number;
  username: string;
  ingredient_indices: number[]; // Array of ingredient indices (0-9) that user will bring
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as Body;
    const { invitation_id, username, ingredient_indices } = body;

    if (!invitation_id || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Verify invitation exists and user is a participant
    const { data: participant, error: participantError } = await supabase
      .from('cookout_participants')
      .select('invitation_id, username, status')
      .eq('invitation_id', invitation_id)
      .eq('username', username)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Get recipe to get ingredient names
    const { data: invitation, error: inviteError } = await supabase
      .from('cookout')
      .select(`
        recipe_id,
        recipe:recipe_id (
          i1, i2, i3, i4, i5, i6, i7, i8, i9, i0
        )
      `)
      .eq('invitation_id', invitation_id)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Handle recipe as either array or object (Supabase can return nested relations as arrays)
    const recipe = Array.isArray(invitation.recipe) 
      ? invitation.recipe[0] 
      : invitation.recipe;
    
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const allIngredients = [
      recipe.i1, recipe.i2, recipe.i3, recipe.i4, recipe.i5,
      recipe.i6, recipe.i7, recipe.i8, recipe.i9, recipe.i0
    ].filter(ing => ing && ing.trim().length > 0);

    // Delete existing ingredient confirmations for this user
    const { error: deleteError } = await supabase
      .from('cookout_participant_ingredients')
      .delete()
      .eq('invitation_id', invitation_id)
      .eq('username', username);

    if (deleteError) {
      // Error deleting existing ingredients, continue anyway
    }

    // Insert new ingredient confirmations
    if (ingredient_indices && ingredient_indices.length > 0) {
      const ingredientRows = ingredient_indices
        .filter(idx => idx >= 0 && idx < allIngredients.length)
        .map(idx => ({
          invitation_id,
          username,
          ingredient_index: idx,
          ingredient_name: allIngredients[idx],
          confirmed: true,
          confirmed_at: new Date().toISOString(),
        }));

      if (ingredientRows.length > 0) {
        const { error: insertError } = await supabase
          .from('cookout_participant_ingredients')
          .insert(ingredientRows);

        if (insertError) {
          return NextResponse.json({ error: 'Failed to save ingredients' }, { status: 500 });
        }
      }
    }

    // Update participant status to accepted if it was pending
    if (participant.status === 'pending') {
      const { error: updateError } = await supabase
        .from('cookout_participants')
        .update({
          status: 'accepted',
          confirmed_at: new Date().toISOString(),
        })
        .eq('invitation_id', invitation_id)
        .eq('username', username);

      if (updateError) {
        // Error updating participant status, continue anyway
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

