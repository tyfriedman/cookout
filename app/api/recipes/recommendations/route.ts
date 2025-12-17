import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { ingredientsMatch } from '@/app/lib/ingredientMatching';

type Body = {
  username: string;
  filters?: {
    dietary?: {
      vegetarian?: boolean;
      vegan?: boolean;
      pescatarian?: boolean;
      glutenFree?: boolean;
      nutFree?: boolean;
      dairyFree?: boolean;
    };
    health?: {
      lowCalorie?: boolean;
      lowFat?: boolean;
      lowSugar?: boolean;
      lowSodium?: boolean;
      lowCarb?: boolean;
    };
    meal?: {
      mainDish?: boolean;
      sideDish?: boolean;
      breakfast?: boolean;
      lunch?: boolean;
      dinner?: boolean;
      dessert?: boolean;
    };
    mealType?: string;
    mealTypes?: string[];
  };
};

export async function POST(request: Request) {
  try {
    const { username, filters } = (await request.json()) as Body;

    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Step 1: Get user's pantry ingredients
    const { data: userPantry, error: pantryError } = await supabase
      .from('pantry')
      .select('food:food_idfk ( food_id, name )')
      .eq('usernamefk', username);

    if (pantryError) {
      return NextResponse.json({ error: 'Database error fetching pantry' }, { status: 500 });
    }

    const userIngredients = new Set<string>();
    (userPantry || []).forEach((row: any) => {
      const food = row.food;
      if (food && food.name) {
        userIngredients.add(food.name);
      }
    });

    // Step 2: Get user's friends
    const { data: friends1, error: friendsError1 } = await supabase
      .from('friends')
      .select('usernamefk_2')
      .eq('usernamefk_1', username);

    const { data: friends2, error: friendsError2 } = await supabase
      .from('friends')
      .select('usernamefk_1')
      .eq('usernamefk_2', username);

    if (friendsError1 || friendsError2) {
      return NextResponse.json({ error: 'Database error fetching friends' }, { status: 500 });
    }

    const friendUsernames = new Set<string>();
    (friends1 || []).forEach((f: any) => friendUsernames.add(f.usernamefk_2));
    (friends2 || []).forEach((f: any) => friendUsernames.add(f.usernamefk_1));

    // Step 3: Get friends' pantry ingredients
    const friendsIngredients = new Set<string>();
    if (friendUsernames.size > 0) {
      const { data: friendsPantry, error: friendsPantryError } = await supabase
        .from('pantry')
        .select('food:food_idfk ( food_id, name )')
        .in('usernamefk', Array.from(friendUsernames));

      if (friendsPantryError) {
        return NextResponse.json({ error: 'Database error fetching friends pantry' }, { status: 500 });
      }

      (friendsPantry || []).forEach((row: any) => {
        const food = row.food;
        if (food && food.name) {
          friendsIngredients.add(food.name);
        }
      });
    }

    // Step 4: Combine into available ingredients set
    const availableIngredients = new Set<string>();
    userIngredients.forEach(ing => availableIngredients.add(ing));
    friendsIngredients.forEach(ing => availableIngredients.add(ing));

    // Step 5: Query recipes matching attribute filters
    const dietary = filters?.dietary ?? {};
    const health = filters?.health ?? {};
    const meal = filters?.meal ?? {};
    const mealString = filters?.mealType as string | undefined;
    const mealArray = (filters?.mealTypes as string[] | undefined) ?? [];

    const dietaryKeys = [
      { key: 'vegetarian', column: 'vegetarian' },
      { key: 'vegan', column: 'vegan' },
      { key: 'pescatarian', column: 'pescatarian' },
      { key: 'glutenFree', column: 'gluten_free' },
      { key: 'nutFree', column: 'nut_free' },
      { key: 'dairyFree', column: 'dairy_free' },
    ] as const;

    const healthKeys = [
      { key: 'lowCalorie', column: 'low_calorie' },
      { key: 'lowFat', column: 'low_fat' },
      { key: 'lowSugar', column: 'low_sugar' },
      { key: 'lowSodium', column: 'low_sodium' },
      { key: 'lowCarb', column: 'low_carb' },
    ] as const;

    const mealKeys = [
      { key: 'mainDish', column: 'main_dish' },
      { key: 'sideDish', column: 'side_dish' },
      { key: 'breakfast', column: 'breakfast' },
      { key: 'lunch', column: 'lunch' },
      { key: 'dinner', column: 'dinner' },
      { key: 'dessert', column: 'dessert' },
    ] as const;

    const mealLabelToColumn: Record<string, string> = {
      'main dish': 'main_dish',
      'side dish': 'side_dish',
      'breakfast': 'breakfast',
      'lunch': 'lunch',
      'dinner': 'dinner',
      'dessert': 'dessert',
    };

    const anyDietary = dietaryKeys.some(k => Boolean(dietary[k.key as keyof typeof dietary]));
    const anyHealth = healthKeys.some(k => Boolean(health[k.key as keyof typeof health]));
    const anyMealBooleans = mealKeys.some(k => Boolean(meal[k.key as keyof typeof meal]));
    const anyMealString = Boolean(mealString && mealString !== 'All');
    const anyMealArray = mealArray.length > 0;
    const anyFilters = anyDietary || anyHealth || anyMealBooleans || anyMealArray || anyMealString;

    const relationSelect = anyFilters ? 'recipe_tags!inner(*)' : 'recipe_tags(*)';

    let query = supabase.from('recipes').select(`
      recipe_id,
      name,
      calories,
      protein,
      carb,
      fat,
      sugar,
      i1, i2, i3, i4, i5, i6, i7, i8, i9, i0,
      ${relationSelect}
    `);

    // Apply filters
    dietaryKeys.forEach(({ key, column }) => {
      if (dietary[key as keyof typeof dietary]) {
        query = query.eq(`recipe_tags.${column}`, true);
      }
    });

    healthKeys.forEach(({ key, column }) => {
      if (health[key as keyof typeof health]) {
        query = query.eq(`recipe_tags.${column}`, true);
      }
    });

    mealKeys.forEach(({ key, column }) => {
      if (meal[key as keyof typeof meal]) {
        query = query.eq(`recipe_tags.${column}`, true);
      }
    });

    if (anyMealString && mealString) {
      const normalized = mealString.toLowerCase().trim();
      const column = mealLabelToColumn[normalized];
      if (column) {
        query = query.eq(`recipe_tags.${column}`, true);
      }
    }

    if (anyMealArray) {
      mealArray.forEach((label) => {
        const normalized = String(label).toLowerCase().trim();
        const column = mealLabelToColumn[normalized];
        if (column) {
          query = query.eq(`recipe_tags.${column}`, true);
        }
      });
    }

    const { data: recipes, error: recipesError } = await query;

    if (recipesError) {
      return NextResponse.json({ error: 'Database error fetching recipes' }, { status: 500 });
    }

    // Step 6: Calculate match percentage for each recipe
    const recipesWithMatch = (recipes || []).map((recipe: any) => {
      const recipeIngredients = [
        recipe.i1, recipe.i2, recipe.i3, recipe.i4, recipe.i5,
        recipe.i6, recipe.i7, recipe.i8, recipe.i9, recipe.i0,
      ].filter((ing: string | null) => ing && ing.trim().length > 0);

      if (recipeIngredients.length === 0) {
        return null; // Skip recipes with no ingredients
      }

      let matchedCount = 0;
      recipeIngredients.forEach((recipeIng: string) => {
        // Check if any available ingredient matches this recipe ingredient
        for (const pantryIng of availableIngredients) {
          if (ingredientsMatch(recipeIng, pantryIng)) {
            matchedCount++;
            break; // Count each recipe ingredient only once
          }
        }
      });

      const matchPercentage = Math.round((matchedCount / recipeIngredients.length) * 100);

      return {
        recipe_id: recipe.recipe_id,
        name: recipe.name,
        calories: recipe.calories,
        protein: recipe.protein,
        carb: recipe.carb,
        fat: recipe.fat,
        sugar: recipe.sugar,
        match_percentage: matchPercentage,
      };
    }).filter((r: any) => r !== null && r.match_percentage > 0) as Array<{
      recipe_id: number;
      name: string;
      calories: number;
      protein: number;
      carb: number;
      fat: number;
      sugar: number;
      match_percentage: number;
    }>;

    // Step 7: Sort by match percentage (descending), then by recipe name
    recipesWithMatch.sort((a, b) => {
      if (b.match_percentage !== a.match_percentage) {
        return b.match_percentage - a.match_percentage;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ recipes: recipesWithMatch });
  } catch (err: any) {
    return NextResponse.json({ recipes: [], error: err.message }, { status: 500 });
  }
}

