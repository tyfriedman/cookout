import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

type PostBody = {
  post_id: number;
  user_id: string; // username
  content: string;
};

// GET - fetch comments for a post
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('post_id');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('comment_id', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ comments: data || [] });
  } catch (e) {
    console.error('GET error:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// POST - add a comment
export async function POST(request: Request) {
  try {
    const { post_id, user_id, content } = (await request.json()) as PostBody;

    if (!post_id || !user_id || !content || content.trim() === '') {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('comments')
      .insert([{ post_id, user_id, content: content.trim() }])
      .select()
      .single();

    if (error) {
      console.error('Insert comment error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (e) {
    console.error('POST error:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}