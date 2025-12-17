import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

type Body = {
  creator_username: string;
  recipe_id: number;
  cookout_date: string; // ISO timestamp string
  creator_ingredients: number[]; // Array of ingredient indices (0-9) that creator has
  invited_usernames: string[]; // Array of usernames to invite
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as Body;
    const { creator_username, recipe_id, cookout_date, creator_ingredients, invited_usernames } = body;

    if (!creator_username || !recipe_id || !cookout_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // First, get the recipe to get ingredient names
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('i1, i2, i3, i4, i5, i6, i7, i8, i9, i0')
      .eq('recipe_id', recipe_id)
      .single();

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const allIngredients = [
      recipe.i1, recipe.i2, recipe.i3, recipe.i4, recipe.i5,
      recipe.i6, recipe.i7, recipe.i8, recipe.i9, recipe.i0
    ].filter(ing => ing && ing.trim().length > 0);

    // Create the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('cookout')
      .insert({
        creator_username,
        recipe_id,
        cookout_date: new Date(cookout_date).toISOString(),
      })
      .select('invitation_id')
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    const invitationId = invitation.invitation_id;

    // Store creator's ingredients
    if (creator_ingredients && creator_ingredients.length > 0) {
      const creatorIngredientRows = creator_ingredients
        .filter(idx => idx >= 0 && idx < allIngredients.length)
        .map(idx => ({
          invitation_id: invitationId,
          ingredient_index: idx,
          ingredient_name: allIngredients[idx],
        }));

      if (creatorIngredientRows.length > 0) {
        const { error: creatorIngError } = await supabase
          .from('cookout_creator_ingredients')
          .insert(creatorIngredientRows);

        if (creatorIngError) {
          // Error storing creator ingredients, continue anyway
        }
      }
    }

    // Add participants (invited users)
    if (invited_usernames && invited_usernames.length > 0) {
      // Verify all usernames exist
      const { data: existingUsers, error: userCheckError } = await supabase
        .from('users')
        .select('username')
        .in('username', invited_usernames);

      if (userCheckError) {
        return NextResponse.json({ error: 'Error verifying users' }, { status: 500 });
      }

      const validUsernames = (existingUsers || []).map(u => u.username);
      const invalidUsernames = invited_usernames.filter(u => !validUsernames.includes(u));

      if (invalidUsernames.length > 0) {
        return NextResponse.json({ 
          error: `Invalid usernames: ${invalidUsernames.join(', ')}` 
        }, { status: 400 });
      }

      // Add creator as participant with accepted status
      const participantRows = [
        {
          invitation_id: invitationId,
          username: creator_username,
          status: 'accepted',
          confirmed_at: new Date().toISOString(),
        },
        ...validUsernames.map(username => ({
          invitation_id: invitationId,
          username,
          status: 'pending',
        })),
      ];

      const { error: participantError } = await supabase
        .from('cookout_participants')
        .insert(participantRows);

      if (participantError) {
        return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 });
      }
    } else {
      // Still add creator as participant
      const { error: participantError } = await supabase
        .from('cookout_participants')
        .insert({
          invitation_id: invitationId,
          username: creator_username,
          status: 'accepted',
          confirmed_at: new Date().toISOString(),
        });

      if (participantError) {
        return NextResponse.json({ error: 'Failed to add creator as participant' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      invitation_id: invitationId 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

