import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

// GET - fetch posts (all posts OR filtered by username)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const currentUser = searchParams.get('currentUser'); // Username of the logged-in user

    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('posts')
      .select('*')
      .order('post_time', { ascending: false });

    // If username provided, filter by that user (for profile page)
    if (username) {
      query = query.eq('usernamefk', username);
    }
    // Otherwise return all posts (for posts feed)

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Fetch profile pictures for all unique usernames
    const usernames = [...new Set((data || []).map((post: any) => post.usernamefk))];
    const { data: usersData } = await supabase
      .from('users')
      .select('username, profile_picture_url')
      .in('username', usernames);

    const profilePicturesMap = new Map(
      (usersData || []).map((user: any) => [user.username, user.profile_picture_url])
    );

    // Fetch like counts and user likes from the likes table for all posts
    const postIds = (data || []).map((post: any) => post.post_id);
    let likeCountsMap = new Map<number | string, number>();
    let userLikesMap = new Map<number | string, boolean>();
    
    if (postIds.length > 0) {
      const { data: likesData } = await supabase
        .from('likes')
        .select('post_id, user_id')
        .in('post_id', postIds);

      // Count likes per post and check if current user has liked
      (likesData || []).forEach((like: any) => {
        const currentCount = likeCountsMap.get(like.post_id) || 0;
        likeCountsMap.set(like.post_id, currentCount + 1);
        
        // Check if current user has liked this post
        if (currentUser && like.user_id === currentUser) {
          userLikesMap.set(like.post_id, true);
        }
      });
    }

    // Add profile picture URLs, accurate like counts, and user like status to posts
    const postsWithProfilePics = (data || []).map((post: any) => ({
      ...post,
      profile_picture_url: profilePicturesMap.get(post.usernamefk) || null,
      like_count: likeCountsMap.get(post.post_id) || 0,
      user_has_liked: userLikesMap.get(post.post_id) || false,
    }));

    return NextResponse.json({ posts: postsWithProfilePics });
  } catch (e) {
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
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Fetch profile picture for the user
    const { data: userData } = await supabase
      .from('users')
      .select('profile_picture_url')
      .eq('username', username)
      .maybeSingle();

    // Add profile picture URL to the post
    const postWithProfilePic = {
      ...data,
      profile_picture_url: userData?.profile_picture_url || null,
    };

    return NextResponse.json({ post: postWithProfilePic }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}