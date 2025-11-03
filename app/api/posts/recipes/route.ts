import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

// GET - fetch all recipes for post selection
export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('recipes')
      .select('recipe_id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ recipes: data || [] });
  } catch (e) {
    console.error('GET error:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}