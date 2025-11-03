import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

// GET - fetch posts by username
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('usernamefk', username)
      .order('post_time', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ posts: data || [] });
  } catch (e) {
    console.error('GET error:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// POST - create a new post
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, recipeid, caption, image_url } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          usernamefk: username,
          recipeid: recipeid || null,
          caption: caption || '',
          image_url: image_url || null,
          like_count: 0,
          post_time: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ post: data }, { status: 201 });
  } catch (e) {
    console.error('POST error:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}