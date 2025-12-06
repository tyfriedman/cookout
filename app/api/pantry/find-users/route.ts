import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

type Body = {
  food_id: number;
  username: string; // Current user to exclude from results
};

export async function POST(request: Request) {
  try {
    const { food_id, username } = (await request.json()) as Body;
    if (!food_id || !username) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    // Find all users who have this ingredient, excluding the current user
    const { data, error } = await supabase
      .from('pantry')
      .select('usernamefk')
      .eq('food_idfk', food_id)
      .neq('usernamefk', username);

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Get unique usernames
    const usernames = Array.from(new Set((data || []).map((row: any) => row.usernamefk as string)));

    return NextResponse.json({ users: usernames });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

