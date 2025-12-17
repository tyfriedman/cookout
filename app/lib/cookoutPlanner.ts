import { findFirstPantryMatch } from '@/app/lib/ingredientMatching';

export type CookoutIngredient = {
  index: number;
  name: string;
};

export type CookoutParticipant = {
  username: string;
  status: string;
  canBring: boolean;
  maxItems: number;
  pantryIngredients: Set<string>;
};

export type CookoutPlanConstraints = {
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

export type CookoutAssignedItem = {
  ingredient_index: number;
  ingredient_name: string;
  source: 'pantry' | 'shopping';
  explanation: string[];
};

export type CookoutShoppingItem = {
  ingredient_index: number;
  ingredient_name: string;
  explanation: string[];
};

export type CookoutPlan = {
  assignments_by_user: Record<string, CookoutAssignedItem[]>;
  shopping_list: CookoutShoppingItem[];
  metrics: {
    total: number;
    already_covered: number;
    assigned_from_pantry: number;
    assigned_to_shopping: number;
    coverage_pct: number;
  };
  unassigned_due_to_capacity: Array<{ ingredient_index: number; ingredient_name: string }>;
};

function roundPct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 100;
  return Math.round((numerator / denominator) * 100);
}

export function buildCookoutPlan(args: {
  required: CookoutIngredient[];
  coveredIndices: Set<number>;
  participants: CookoutParticipant[];
}): CookoutPlan {
  const { required, coveredIndices, participants } = args;

  const total = required.length;
  const coveredInRange = new Set<number>();
  for (const ing of required) {
    if (coveredIndices.has(ing.index)) coveredInRange.add(ing.index);
  }

  const alreadyCoveredCount = coveredInRange.size;
  const uncovered = required
    .filter((ing) => !coveredInRange.has(ing.index))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  // Ensure deterministic iteration order for participants.
  const activeParticipants = participants
    .filter((p) => p.canBring && p.maxItems > 0)
    .slice()
    .sort((a, b) => a.username.localeCompare(b.username));

  const assignedCount = new Map<string, number>();
  const assignmentsByUser: Record<string, CookoutAssignedItem[]> = {};
  for (const p of activeParticipants) {
    assignedCount.set(p.username, 0);
    assignmentsByUser[p.username] = [];
  }

  // Precompute pantry match counts per ingredient.
  const pantryMatchCountByIndex = new Map<number, number>();
  const pantryMatchUsernamesByIndex = new Map<number, string[]>();

  for (const ing of uncovered) {
    const matchingUsers: string[] = [];
    for (const p of activeParticipants) {
      const match = findFirstPantryMatch(ing.name, p.pantryIngredients);
      if (match) matchingUsers.push(p.username);
    }
    pantryMatchUsernamesByIndex.set(ing.index, matchingUsers.slice().sort());
    pantryMatchCountByIndex.set(ing.index, matchingUsers.length);
  }

  // Hardest-first ordering.
  uncovered.sort((a, b) => {
    const aCount = pantryMatchCountByIndex.get(a.index) ?? 0;
    const bCount = pantryMatchCountByIndex.get(b.index) ?? 0;
    if (aCount !== bCount) return aCount - bCount;
    return a.name.localeCompare(b.name);
  });

  const shoppingListMap = new Map<number, CookoutShoppingItem>();
  const unassignedDueToCapacity: Array<{ ingredient_index: number; ingredient_name: string }> = [];

  for (const ing of uncovered) {
    // Determine best candidate among participants with remaining capacity.
    let best: CookoutParticipant | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    let bestHasPantryMatch = false;
    let bestMatchedPantryName: string | null = null;

    for (const p of activeParticipants) {
      const current = assignedCount.get(p.username) ?? 0;
      if (current >= p.maxItems) continue;

      const matchedPantryName = findFirstPantryMatch(ing.name, p.pantryIngredients);
      const hasPantryMatch = Boolean(matchedPantryName);

      // Lower score is better.
      // Strong preference for pantry matches, then fairness (load), then a small penalty for pending.
      const pantryPenalty = hasPantryMatch ? 0 : 1000;
      const fairnessPenalty = current * 10;
      const pendingPenalty = p.status === 'pending' ? 3 : 0;
      const score = pantryPenalty + fairnessPenalty + pendingPenalty;

      if (score < bestScore) {
        bestScore = score;
        best = p;
        bestHasPantryMatch = hasPantryMatch;
        bestMatchedPantryName = matchedPantryName;
      } else if (score === bestScore && best && p.username.localeCompare(best.username) < 0) {
        // Deterministic tie-breaker.
        best = p;
        bestHasPantryMatch = hasPantryMatch;
        bestMatchedPantryName = matchedPantryName;
      }
    }

    if (!best) {
      // No capacity left across participants. Add to shopping list and record as unassigned.
      const explanation = [
        'No participant capacity remaining for assignment.',
        'Add this item to the shopping list.',
      ];
      shoppingListMap.set(ing.index, {
        ingredient_index: ing.index,
        ingredient_name: ing.name,
        explanation,
      });
      unassignedDueToCapacity.push({ ingredient_index: ing.index, ingredient_name: ing.name });
      continue;
    }

    const prevCount = assignedCount.get(best.username) ?? 0;
    const nextCount = prevCount + 1;
    assignedCount.set(best.username, nextCount);

    const source: 'pantry' | 'shopping' = bestHasPantryMatch ? 'pantry' : 'shopping';
    const explanation: string[] = [];

    if (bestHasPantryMatch && bestMatchedPantryName) {
      explanation.push(`Matched in pantry: ${bestMatchedPantryName}`);
    } else {
      const numWithMatch = pantryMatchCountByIndex.get(ing.index) ?? 0;
      if (numWithMatch === 0) {
        explanation.push('No pantry match found for any participant.');
      } else {
        const matchingUsers = pantryMatchUsernamesByIndex.get(ing.index) ?? [];
        explanation.push(`No pantry match for ${best.username}; others match: ${matchingUsers.join(', ') || 'none'}`);
      }
      explanation.push('This item likely requires shopping.');
      shoppingListMap.set(ing.index, {
        ingredient_index: ing.index,
        ingredient_name: ing.name,
        explanation: ['Uncovered by pantry; include on shopping list.'],
      });
    }

    if (best.status === 'pending') {
      explanation.push('Assigned to a pending participant (adjust if they decline).');
    }

    explanation.push(`Load balancing: ${best.username} now has ${nextCount} assigned item(s).`);

    assignmentsByUser[best.username].push({
      ingredient_index: ing.index,
      ingredient_name: ing.name,
      source,
      explanation: explanation.slice(0, 4),
    });
  }

  // Deterministic ordering in output
  for (const username of Object.keys(assignmentsByUser)) {
    assignmentsByUser[username].sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name));
  }

  const shoppingList = Array.from(shoppingListMap.values()).sort((a, b) =>
    a.ingredient_name.localeCompare(b.ingredient_name)
  );

  const assignedFromPantry = Object.values(assignmentsByUser).reduce(
    (acc, items) => acc + items.filter((i) => i.source === 'pantry').length,
    0
  );

  const assignedToShopping = shoppingList.length;
  const coveragePct = roundPct(alreadyCoveredCount + assignedFromPantry, total);

  return {
    assignments_by_user: assignmentsByUser,
    shopping_list: shoppingList,
    metrics: {
      total,
      already_covered: alreadyCoveredCount,
      assigned_from_pantry: assignedFromPantry,
      assigned_to_shopping: assignedToShopping,
      coverage_pct: coveragePct,
    },
    unassigned_due_to_capacity: unassignedDueToCapacity,
  };
}


