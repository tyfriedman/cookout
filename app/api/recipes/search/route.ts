import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

export async function POST(request: Request) {
    try {
        const { filters, keywords } = await request.json();

        const supabase = getSupabaseServerClient();
        
        let query = supabase.from('recipes').select(`
            recipe_id,
            name, 
            calories, 
            protein,
            carb,
            fat,
            sugar,
            recipe_tags(*)
            `)
            .ilike('name', `%${keywords.trim()}%`)
            .eq('recipe_tags.vegetarian', filters.dietary.vegetarian)
            .eq('recipe_tags.vegan', filters.dietary.vegan)
            .eq('recipe_tags.pescatarian', filters.dietary.pescatarian)
            .eq('recipe_tags.gluten_free', filters.dietary.glutenFree)
            .eq('recipe_tags.nut_free', filters.dietary.nutFree)
            .eq('recipe_tags.dairy_free', filters.dietary.dairyFree)
            .eq('recipe_tags.low_calorie', filters.health.lowCalorie)
            .eq('recipe_tags.low_fat', filters.health.lowFat)
            .eq('recipe_tags.low_sugar', filters.health.lowSugar)
            .eq('recipe_tags.low_sodium', filters.health.lowSodium)
            .eq('recipe_tags.low_carb', filters.health.lowCarb);

        // if (keywords && keywords.trim() !== '') {
        //     query = query.ilike('name', `%${keywords}%`);
        // }

        // const mealTypeColumnMap: Record<string, string> = {
        //     "Main Dish": "main_dish",
        //     "Side Dish": "side_dish",
        //     "Breakfast": "breakfast",
        //     "Lunch": "lunch",
        //     "Dinner": "dinner",
        //     "Dessert": "dessert"
        //     };

        // if (filters?.mealType && filters.mealType !== 'All') {
        //     const columnName = mealTypeColumnMap[filters.mealType];
        //     if (columnName) {
        //         query = query.eq(`recipe_tags.${columnName}`, true);
        //     }
        // }

        // if (filters?.dietary) {
        //     if (filters.dietary.vegetarian) query = query.eq('recipe_tags.vegetarian', true);
        //     if (filters.dietary.vegan) query = query.eq('recipe_tags.vegan', true);
        //     if (filters.dietary.pescatarian) query = query.eq('recipe_tags.pescatarian', true);
        //     if (filters.dietary.glutenFree) query = query.eq('recipe_tags.gluten_free', true);
        //     if (filters.dietary.nutFree) query = query.eq('recipe_tags.nut_free', true);
        //     if (filters.dietary.dairyFree) query = query.eq('recipe_tags.dairy_free', true);
        // }

        // if (filters?.health) {
        //     if (filters.health.lowCalorie) query = query.eq('recipe_tags.low_calorie', true);
        //     if (filters.health.lowFat) query = query.eq('recipe_tags.low_fat', true);
        //     if (filters.health.lowSugar) query = query.eq('recipe_tags.low_sugar', true);
        //     if (filters.health.lowSodium) query = query.eq('recipe_tags.low_sodium', true);
        //     if (filters.health.lowCarb) query = query.eq('recipe_tags.low_carb', true);
        // }


        const { data, error } = await query;

        if (error) throw error;

        // const recipes = data?.map(r => ({
        //     recipe_id: r.recipe_id,
        //     name: r.name,
        //     calories: r.calories,
        //     protein: r.protein,
        //     carb: r.carb,
        //     fat: r.fat,
        //     sugar: r.sugar
        // })) || [];

        return NextResponse.json({ recipes: data || [] });
    } catch (err: any) {
        console.error('Error fetching recipes: ', err);
        return NextResponse.json({ recipes: [], error: err.message }, { status: 500 });
    }
}