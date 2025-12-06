// app/api/posts/comments/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

type PostBody = {
  postId: string;
  username: string;
  content: string;
};

// GET comments for a specific post
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('comment_time', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch profile pictures for all unique user_ids
    const userIds = [...new Set((comments || []).map((comment: any) => comment.user_id))];
    const { data: usersData } = await supabase
      .from('users')
      .select('username, profile_picture_url')
      .in('username', userIds);

    const profilePicturesMap = new Map(
      (usersData || []).map((user: any) => [user.username, user.profile_picture_url])
    );

    // Add profile picture URLs to comments
    const commentsWithProfilePics = (comments || []).map((comment: any) => ({
      ...comment,
      profile_picture_url: profilePicturesMap.get(comment.user_id) || null,
    }));

    return NextResponse.json({ comments: commentsWithProfilePics }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST a new comment
export async function POST(request: Request) {
  try {
    const { postId, username, content } = (await request.json()) as PostBody;

    if (!postId || !username || !content) {
      return NextResponse.json(
        { error: 'Missing fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Verify the post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('post_id')
      .eq('post_id', postId)
      .maybeSingle();

    if (postError) {
      console.error('Error verifying post:', postError);
      return NextResponse.json(
        { error: 'Database error (post verify)' },
        { status: 500 }
      );
    }

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Insert comment with current timestamp
    const commentTime = new Date().toISOString();

    console.log('Inserting comment:', { postId, username, commentTime, content });

    const { data: newComment, error: insertError } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: username,
        comment_time: commentTime,
        content: content
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting comment:', insertError);
      return NextResponse.json(
        { error: `Database error: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, comment: newComment },
      { status: 201 }
    );
  } catch (e) {
    console.error('Unexpected error in POST:', e);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}