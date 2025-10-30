import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

type Body = {
  username: string;
};

export async function POST(request: Request) {
  try {
    const { username } = (await request.json()) as Body;
    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('pantry')
      .select('food:food_idfk ( food_id, name )')
      .eq('usernamefk', username);

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const items = (data || []).map((row: any) => ({
      food_id: row.food.food_id as number,
      name: row.food.name as string,
    }));

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}


