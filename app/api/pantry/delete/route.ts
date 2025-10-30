import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

type Body = {
  username: string;
  food_id: number;
};

export async function POST(request: Request) {
  try {
    const { username, food_id } = (await request.json()) as Body;
    if (!username || !food_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from('pantry')
      .delete()
      .match({ usernamefk: username, food_idfk: food_id });

    if (error) {
      return NextResponse.json({ error: 'Database error (pantry delete)' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}


