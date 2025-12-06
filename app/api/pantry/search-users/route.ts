import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

type Body = {
  query: string; // Search query for ingredient name
  username: string; // Current user to exclude from results
};

export async function POST(request: Request) {
  try {
    const { query, username } = (await request.json()) as Body;
    if (!query || !username) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const searchQuery = query.trim();
    if (!searchQuery) {
      return NextResponse.json({ results: [] });
    }

    const supabase = getSupabaseServerClient();
    
    // First, find all foods matching the search query
    const { data: foods, error: foodError } = await supabase
      .from('food')
      .select('food_id, name')
      .ilike('name', `%${searchQuery}%`)
      .limit(50); // Limit to prevent too many results

    if (foodError) {
      return NextResponse.json({ error: 'Database error (food search)' }, { status: 500 });
    }

    if (!foods || foods.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Get food_ids
    const foodIds = foods.map(f => f.food_id);

    // Now find all pantry items with these food_ids, excluding current user
    const { data: pantryData, error: pantryError } = await supabase
      .from('pantry')
      .select('usernamefk, food:food_idfk ( food_id, name )')
      .in('food_idfk', foodIds)
      .neq('usernamefk', username);

    if (pantryError) {
      return NextResponse.json({ error: 'Database error (pantry search)' }, { status: 500 });
    }

    // Group by ingredient (food_id) and collect users
    const ingredientMap = new Map<number, { food_id: number; name: string; users: string[] }>();
    
    (pantryData || []).forEach((row: any) => {
      const food = row.food;
      if (!food) return;
      
      const foodId = food.food_id as number;
      const foodName = food.name as string;
      const usernamefk = row.usernamefk as string;
      
      if (!ingredientMap.has(foodId)) {
        ingredientMap.set(foodId, { food_id: foodId, name: foodName, users: [] });
      }
      
      const ingredient = ingredientMap.get(foodId)!;
      if (!ingredient.users.includes(usernamefk)) {
        ingredient.users.push(usernamefk);
      }
    });

    // Convert map to array and sort by name
    const results = Array.from(ingredientMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

