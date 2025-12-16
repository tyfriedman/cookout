import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Get all participants for this user
    const { data: participants, error: participantError } = await supabase
      .from('cookout_participants')
      .select('invitation_id, status, confirmed_at')
      .eq('username', username);

    if (participantError) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json({ invitations: [] });
    }

    // Get all invitation IDs
    const invitationIds = participants.map(p => p.invitation_id);

    // Fetch invitations separately
    const { data: invitations, error: inviteError } = await supabase
      .from('cookout_invitations')
      .select('invitation_id, creator_username, recipe_id, cookout_date, created_at')
      .in('invitation_id', invitationIds);

    if (inviteError) {
      return NextResponse.json({ error: 'Database error fetching invitations' }, { status: 500 });
    }

    // Get recipe IDs
    const recipeIds = [...new Set((invitations || []).map(inv => inv.recipe_id))];

    // Fetch recipes separately
    const { data: recipes, error: recipeError } = await supabase
      .from('recipes')
      .select('recipe_id, name')
      .in('recipe_id', recipeIds);

    if (recipeError) {
      // Error fetching recipes, continue with empty recipe map
    }

    // Create a map of recipe_id -> recipe name
    const recipeMap = new Map(
      (recipes || []).map(r => [r.recipe_id, r.name])
    );

    // Create a map of invitation_id -> participant data
    const participantMap = new Map(
      participants.map(p => [p.invitation_id, p])
    );

    // Format the response
    const invitationsFormatted = (invitations || []).map((inv: any) => {
      const participant = participantMap.get(inv.invitation_id);
      return {
        invitation_id: inv.invitation_id,
        creator_username: inv.creator_username,
        recipe_id: inv.recipe_id,
        recipe_name: recipeMap.get(inv.recipe_id) || 'Unknown Recipe',
        cookout_date: inv.cookout_date,
        created_at: inv.created_at,
        status: participant?.status || 'pending',
        confirmed_at: participant?.confirmed_at || null,
        is_creator: inv.creator_username === username,
      };
    });

    return NextResponse.json({ invitations: invitationsFormatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

