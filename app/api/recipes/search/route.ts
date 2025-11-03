import { NextResponse } from 'next/server';
import { supabase } from '@lib/supabaseClient';

export async function POST(request: Request) {
    try {
        const { filters, keywords } = await request.json();

        let query = supabase.from('recipes').select(`
            recipe_id,
            name, 
            calories, 
            
            `);

        if (filters?.mealType && filters.mealType !== 'All') {
            query = query.eq()
        }
    }
}