export function normalizeIngredient(name: string): string {
  return String(name || '').toLowerCase().trim();
}

/**
 * Very lightweight ingredient matching:
 * - case/whitespace normalization
 * - exact match
 * - substring match either direction
 *
 * This intentionally mirrors the behavior used by recipe recommendations.
 */
export function ingredientsMatch(recipeIngredient: string, pantryIngredient: string): boolean {
  if (!recipeIngredient || !pantryIngredient) return false;

  const recipeNorm = normalizeIngredient(recipeIngredient);
  const pantryNorm = normalizeIngredient(pantryIngredient);

  if (!recipeNorm || !pantryNorm) return false;

  if (recipeNorm === pantryNorm) return true;

  if (recipeNorm.includes(pantryNorm) || pantryNorm.includes(recipeNorm)) {
    return true;
  }

  return false;
}

export function findFirstPantryMatch(
  recipeIngredient: string,
  pantryIngredients: Iterable<string>
): string | null {
  for (const pantryIng of pantryIngredients) {
    if (ingredientsMatch(recipeIngredient, pantryIng)) return pantryIng;
  }
  return null;
}


