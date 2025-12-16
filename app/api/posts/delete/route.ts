import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

type Body = {
  post_id: number;
  username: string;
};

export async function POST(request: Request) {
  try {
    const { post_id, username } = (await request.json()) as Body;

    if (!post_id || !username) {
      return NextResponse.json({ error: 'Post ID and username required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Verify the post belongs to the user
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('usernamefk')
      .eq('post_id', post_id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.usernamefk !== username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('post_id', post_id);

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}