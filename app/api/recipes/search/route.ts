import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

export async function POST(request: Request) {
    try {
        const { filters, keywords } = await request.json();

        const supabase = getSupabaseServerClient();

        // Determine if any filters are active (true) so we can apply an inner join
        const dietary = filters?.dietary ?? {};
        const health = filters?.health ?? {};

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

        const anyDietary = dietaryKeys.some(k => Boolean(dietary[k.key as keyof typeof dietary]));
        const anyHealth = healthKeys.some(k => Boolean(health[k.key as keyof typeof health]));
        const anyFilters = anyDietary || anyHealth;

        const relationSelect = anyFilters ? 'recipe_tags!inner(*)' : 'recipe_tags(*)';

        let query = supabase.from('recipes').select(`
            recipe_id,
            name,
            calories,
            protein,
            carb,
            fat,
            sugar,
            ${relationSelect}
        `);

        if (keywords && keywords.trim() !== '') {
            query = query.ilike('name', `%${keywords.trim()}%`);
        }

        // Apply only filters explicitly set to true
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

        // (legacy conditional filters retained above in a more concise form)


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