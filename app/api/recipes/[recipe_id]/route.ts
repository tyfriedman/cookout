import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

export async function GET(request: NextRequest, context: { params: Promise<{ recipe_id: string }> }) {
  try {
    const { recipe_id } = await context.params;
    const recipeId = Number(recipe_id);

    if (isNaN(recipeId)) {
    return NextResponse.json({ recipe: null, error: 'Invalid recipe ID' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
    .from('recipes')
    .select('recipe_id, name, calories, protein, carb, fat, sugar, instructions, recipe_tags(*), i1, i2, i3, i4, i5, i6, i7, i8, i9, i0')
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
        description: (Array.isArray(data.recipe_tags)
          ? data.recipe_tags[0]?.description
          : (data as any).recipe_tags?.description) || '',
        ingredients: [data.i1, data.i2, data.i3, data.i4, data.i5, data.i6, data.i7, data.i8, data.i9, data.i0],
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ recipe: null, error: err.message }, { status: 500 });
  }
}
