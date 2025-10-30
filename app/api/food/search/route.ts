import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    const limitParam = url.searchParams.get('limit');
    const limit = Math.min(Math.max(Number(limitParam || 10), 1), 50);

    if (!q) {
      return NextResponse.json({ items: [] });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('food')
      .select('food_id, name')
      .ilike('name', `%${q}%`)
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ items: data || [] });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}


