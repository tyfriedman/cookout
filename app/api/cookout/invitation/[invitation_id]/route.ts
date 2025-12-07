import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ invitation_id: string }> }
) {
  try {
    const { invitation_id } = await context.params;
    const invitationId = Number(invitation_id);

    if (isNaN(invitationId)) {
      return NextResponse.json({ error: 'Invalid invitation ID' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('cookout_invitations')
      .select(`
        invitation_id,
        creator_username,
        recipe_id,
        cookout_date,
        created_at,
        recipe:recipe_id (
          recipe_id,
          name,
          i1, i2, i3, i4, i5, i6, i7, i8, i9, i0
        )
      `)
      .eq('invitation_id', invitationId)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Get creator's ingredients
    const { data: creatorIngredients, error: creatorError } = await supabase
      .from('cookout_creator_ingredients')
      .select('ingredient_index, ingredient_name')
      .eq('invitation_id', invitationId);

    if (creatorError) {
      console.error('Error fetching creator ingredients:', creatorError);
    }

    // Get all participants
    const { data: participants, error: participantError } = await supabase
      .from('cookout_participants')
      .select('username, status')
      .eq('invitation_id', invitationId);

    if (participantError) {
      console.error('Error fetching participants:', participantError);
    }

    // Get all participant ingredients separately
    const { data: participantIngredients, error: participantIngError } = await supabase
      .from('cookout_participant_ingredients')
      .select('username, ingredient_index, ingredient_name, confirmed')
      .eq('invitation_id', invitationId)
      .eq('confirmed', true);

    if (participantIngError) {
      console.error('Error fetching participant ingredients:', participantIngError);
    }

    // Build ingredients list
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

    const creatorIndices = new Set(
      (creatorIngredients || []).map((ci: any) => ci.ingredient_index)
    );

    const participantIngredientsMap = new Map<string, Set<number>>();
    (participantIngredients || []).forEach((ing: any) => {
      if (!participantIngredientsMap.has(ing.username)) {
        participantIngredientsMap.set(ing.username, new Set());
      }
      participantIngredientsMap.get(ing.username)!.add(ing.ingredient_index);
    });

    // Build ingredient status
    const ingredients = allIngredients.map((ingName, index) => {
      const isCreatorProvided = creatorIndices.has(index);
      const providedBy: string[] = [];
      
      participantIngredientsMap.forEach((indices, username) => {
        if (indices.has(index)) {
          providedBy.push(username);
        }
      });

      return {
        index,
        name: ingName,
        is_creator_provided: isCreatorProvided,
        provided_by: providedBy,
        is_covered: isCreatorProvided || providedBy.length > 0,
      };
    });

    return NextResponse.json({
      invitation: {
        invitation_id: invitation.invitation_id,
        creator_username: invitation.creator_username,
        recipe_id: invitation.recipe_id,
        recipe_name: recipe.name,
        cookout_date: invitation.cookout_date,
        created_at: invitation.created_at,
        ingredients,
        participants: (participants || []).map((p: any) => ({
          username: p.username,
          status: p.status,
        })),
      },
    });
  } catch (err: any) {
    console.error('Error fetching invitation details:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

