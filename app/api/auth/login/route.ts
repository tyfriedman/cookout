import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import bcrypt from 'bcryptjs';

type LoginBody = {
  username: string;
  password: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('username, password_hash, firstname, lastname, email')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!user || !user.password_hash) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Normally you would issue a session or JWT here. For now, return basic info.
    return NextResponse.json({ ok: true, user: { username: user.username, firstname: user.firstname, lastname: user.lastname, email: user.email } });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}


