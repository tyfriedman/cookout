import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, profile_picture_url } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    if (!profile_picture_url) {
      return NextResponse.json({ error: 'Profile picture URL required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('users')
      .update({ profile_picture_url })
      .eq('username', username)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: 'Failed to update profile picture' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: data });
  } catch (e) {
    console.error('Update profile picture error:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

