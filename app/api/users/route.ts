import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('username, firstname, lastname, email, join_date, profile_picture_url')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user: data });
}


