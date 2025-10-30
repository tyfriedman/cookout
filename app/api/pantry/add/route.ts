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

    // Validate food exists
    const { data: food, error: foodErr } = await supabase
      .from('food')
      .select('food_id')
      .eq('food_id', food_id)
      .maybeSingle();
    if (foodErr) {
      return NextResponse.json({ error: 'Database error (food select)' }, { status: 500 });
    }
    if (!food) {
      return NextResponse.json({ error: 'Food not found' }, { status: 404 });
    }

    // Insert into pantry (composite PK prevents duplicates)
    const { error: pantryErr } = await supabase
      .from('pantry')
      .insert([{ usernamefk: username, food_idfk: food_id }]);

    if (pantryErr) {
      // Ignore conflict duplicates gracefully
      if ((pantryErr as any).code !== '23505') {
        return NextResponse.json({ error: 'Database error (pantry insert)' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}


