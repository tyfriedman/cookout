import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

type Body = {
  query: string; // Search query for username
};

export async function POST(request: Request) {
  try {
    const { query } = await request.json() as Body;
    if (!query) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    const searchQuery = query.trim();
    if (!searchQuery) {
      return NextResponse.json({ users: [] });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('users')
      .select('username, firstname, lastname')
      .ilike('username', `%${searchQuery}%`)
      .limit(20);

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ users: data || [] });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

