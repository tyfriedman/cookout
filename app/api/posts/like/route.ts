import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

type Body = {
  post_id: number;
  user_id: string; // username
};

// POST - toggle like on a post
export async function POST(request: Request) {
  try {
    const { post_id, user_id } = (await request.json()) as Body;

    if (!post_id || !user_id) {
      return NextResponse.json({ error: 'Post ID and user ID required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Check if user has already liked this post
    const { data: existingLike, error: checkError } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', post_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (checkError) {
      console.error('Check like error:', checkError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (existingLike) {
      // Unlike - remove the like
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post_id)
        .eq('user_id', user_id);

      if (deleteError) {
        console.error('Delete like error:', deleteError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      return NextResponse.json({ liked: false });
    } else {
      // Like - add the like
      const { error: insertError } = await supabase
        .from('likes')
        .insert([{ post_id, user_id }]);

      if (insertError) {
        console.error('Insert like error:', insertError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      return NextResponse.json({ liked: true });
    }
  } catch (e) {
    console.error('POST error:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// GET - get like count and check if user has liked
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('post_id');
    const userId = searchParams.get('user_id');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Get total like count
    const { data: likes, error: countError } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', postId);

    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const likeCount = likes?.length || 0;
    const userHasLiked = userId ? likes?.some(like => like.user_id === userId) : false;

    return NextResponse.json({ likeCount, userHasLiked });
  } catch (e) {
    console.error('GET error:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}