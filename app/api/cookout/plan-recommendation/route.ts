import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { buildCookoutPlan, CookoutParticipant } from '@/app/lib/cookoutPlanner';

type Body = {
  invitation_id: number;
  viewer_username?: string;
  constraints?: {
    include_pending_participants?: boolean;
    max_items_per_person?: number;
    participant_overrides?: Record<
      string,
      {
        can_bring?: boolean;
        max_items?: number;
        allergens?: string[];
        budget_cents?: number;
        travel_penalty?: number;
      }
    >;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const invitationId = Number(body.invitation_id);

    if (!invitationId || Number.isNaN(invitationId)) {
      return NextResponse.json({ error: 'Invalid invitation_id' }, { status: 400 });
    }

    const constraints = body.constraints ?? {};
    const includePending = constraints.include_pending_participants ?? true;
    const maxItemsPerPerson = Math.max(0, Math.min(Number(constraints.max_items_per_person ?? 3), 20));
    const participantOverrides = constraints.participant_overrides ?? {};

    const supabase = getSupabaseServerClient();

    // Load invitation + recipe ingredients
    const { data: invitation, error: inviteError } = await supabase
      .from('cookout')
      .select(
        `
        invitation_id,
        creator_username,
        recipe_id,
        recipe:recipe_id (
          i1, i2, i3, i4, i5, i6, i7, i8, i9, i0
        )
      `
      )
      .eq('invitation_id', invitationId)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const recipe = Array.isArray((invitation as any).recipe) ? (invitation as any).recipe[0] : (invitation as any).recipe;
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const allIngredients = [
      recipe.i1,
      recipe.i2,
      recipe.i3,
      recipe.i4,
      recipe.i5,
      recipe.i6,
      recipe.i7,
      recipe.i8,
      recipe.i9,
      recipe.i0,
    ].filter((ing: string | null) => ing && ing.trim().length > 0) as string[];

    const required = allIngredients.map((name, index) => ({ index, name }));

    // Covered indices: creator-provided + any confirmed participant ingredients.
    const coveredIndices = new Set<number>();

    const { data: creatorIngredients } = await supabase
      .from('cookout_creator_ingredients')
      .select('ingredient_index')
      .eq('invitation_id', invitationId);

    (creatorIngredients || []).forEach((ci: any) => {
      if (typeof ci.ingredient_index === 'number') coveredIndices.add(ci.ingredient_index);
    });

    const { data: participantIngredients } = await supabase
      .from('cookout_participant_ingredients')
      .select('ingredient_index')
      .eq('invitation_id', invitationId)
      .eq('confirmed', true);

    (participantIngredients || []).forEach((pi: any) => {
      if (typeof pi.ingredient_index === 'number') coveredIndices.add(pi.ingredient_index);
    });

    // Load participants
    let participantQuery = supabase
      .from('cookout_participants')
      .select('username, status')
      .eq('invitation_id', invitationId);

    if (!includePending) {
      participantQuery = participantQuery.eq('status', 'accepted');
    }

    const { data: participantsRaw, error: participantsError } = await participantQuery;

    if (participantsError) {
      return NextResponse.json({ error: 'Database error fetching participants' }, { status: 500 });
    }

    const usernames = (participantsRaw || []).map((p: any) => p.username).filter(Boolean) as string[];

    // Load all pantry items for participants in one query
    const pantryMap = new Map<string, Set<string>>();
    usernames.forEach((u) => pantryMap.set(u, new Set()));

    if (usernames.length > 0) {
      const { data: pantryRows, error: pantryErr } = await supabase
        .from('pantry')
        .select('usernamefk, food:food_idfk ( name )')
        .in('usernamefk', usernames);

      if (pantryErr) {
        return NextResponse.json({ error: 'Database error fetching pantry' }, { status: 500 });
      }

      (pantryRows || []).forEach((row: any) => {
        const u = row.usernamefk as string | undefined;
        const foodName = row?.food?.name as string | undefined;
        if (!u || !foodName) return;
        if (!pantryMap.has(u)) pantryMap.set(u, new Set());
        pantryMap.get(u)!.add(foodName);
      });
    }

    // Apply overrides and build planner participants
    const plannerParticipants: CookoutParticipant[] = (participantsRaw || []).map((p: any) => {
      const username = p.username as string;
      const status = (p.status as string) || 'pending';
      const override = participantOverrides[username] ?? {};
      const canBring = override.can_bring ?? true;
      const maxItems = Math.max(0, Math.min(Number(override.max_items ?? maxItemsPerPerson), 50));

      return {
        username,
        status,
        canBring,
        maxItems,
        pantryIngredients: pantryMap.get(username) ?? new Set(),
      };
    });

    const plan = buildCookoutPlan({
      required,
      coveredIndices,
      participants: plannerParticipants,
    });

    // If a viewer username is provided, include a convenience subset for the UI.
    const viewerUsername = body.viewer_username ? String(body.viewer_username) : null;
    const viewer = viewerUsername && plan.assignments_by_user[viewerUsername] ? plan.assignments_by_user[viewerUsername] : [];

    return NextResponse.json({ plan, viewer });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}


