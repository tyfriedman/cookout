import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

export async function GET(request: Request, { params }: { params: { recipe_id: string } }) {
  try {
    const url = new URL(request.url);
    const recipeIdStr = url.pathname.split('/').pop(); // get the last segment
    const recipeId = Number(recipeIdStr);

    if (isNaN(recipeId)) {
    return NextResponse.json({ recipe: null, error: 'Invalid recipe ID' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
    .from('recipes')
    .select('recipe_id, name, calories, protein, carb, fat, sugar, instructions, recipe_tags(*)')
    .eq('recipe_id', recipeId)
    .single();


    if (error) throw error;

    return NextResponse.json({
      recipe: {
        recipe_id: data.recipe_id,
        name: data.name,
        calories: data.calories,
        protein: data.protein,
        carb: data.carb,
        fat: data.fat,
        sugar: data.sugar,
        instructions: data.instructions,
        description: data.recipe_tags?.description || '',
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ recipe: null, error: err.message }, { status: 500 });
  }
}
