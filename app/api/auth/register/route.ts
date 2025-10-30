import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import bcrypt from 'bcryptjs';

type RegisterBody = {
  username: string;
  firstname?: string;
  lastname?: string;
  email: string;
  password: string;
};

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidUsername(username: string): boolean {
  // 2-50 chars, letters, numbers, underscores, hyphens
  return /^[A-Za-z0-9_-]{2,50}$/.test(username);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;
    const { username, firstname, lastname, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!isValidUsername(username)) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const supabase = getSupabaseServerClient();

    // Check if username already exists
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (selectError) {
      return NextResponse.json({ error: 'Database error (select)' }, { status: 500 });
    }
    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    const join_date = new Date().toISOString();
    const { error: insertError } = await supabase.from('users').insert([
      { username, firstname: firstname ?? null, lastname: lastname ?? null, email, password_hash, join_date },
    ]);

    if (insertError) {
      return NextResponse.json({ error: 'Database error (insert)' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}


