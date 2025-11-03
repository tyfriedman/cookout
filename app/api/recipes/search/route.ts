import { NextResponse } from 'next/server';
import { supabase } from '@lib/supabaseClient';

export async function POST(request: Request) {
    try {
        const { filters, keywords } = await request.json();

        let query = supabase.from('recipes').select(`
            recipe_id,
            name, 
            calories, 
            recipe_tags(*)
            `);

        if (keywords && keywords.trim() !== '') {
            query = query.ilike('name', `%${keywords}%`);
        }

        const mealTypeColumnMap: Record<string, string> = {
            "Main Dish": "main_dish",
            "Side Dish": "side_dish",
            "Breakfast": "breakfast",
            "Lunch": "lunch",
            "Dinner": "dinner",
            "Snack": "snack",
            "Dessert": "dessert"
            };

        if (filters?.mealType && filters.mealType !== 'All') {
            const columnName = mealTypeColumnMap[filters.mealType];
            if (columnName) {
                query = query.eq(`recipe_tags.${columnName}`, true);
            }
        }

        if (filters?.mealType && filters.mealType !== 'All') {
            if (filters.mealType.)
                <option>All</option>
          <option>Main Dish</option>
          <option>Side Dish</option>
          <option>Breakfast</option>
          <option>Lunch</option>
          <option>Dinner</option>
          <option>Snack</option>
          <option>Dessert</option>
        }
    }
}