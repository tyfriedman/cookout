import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import fs from 'fs';

// #region agent log helper
function logDebug(payload: Record<string, any>) {
  try {
    fs.appendFileSync(
      '/Users/tyfriedman/nd/databases/cookout/.cursor/debug.log',
      JSON.stringify({
        sessionId: 'debug-session',
        runId: 'run1',
        timestamp: Date.now(),
        ...payload,
      }) + '\n',
      { encoding: 'utf8' }
    );
  } catch {
    // swallow logging errors in debug mode
  }
}
// #endregion

// GET - fetch posts (all posts OR filtered by username)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

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

    // #region agent log
    logDebug({
      location: 'app/api/posts/route.ts:26',
      message: 'Fetched posts from Supabase',
      data: { count: data?.length ?? 0, first: data?.[0] ?? null, username },
      hypothesisId: 'A',
    });
    // #endregion

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Fetch profile pictures for all unique usernames
    const usernames = [...new Set((data || []).map((post: any) => post.usernamefk))];
    const { data: usersData } = await supabase
      .from('users')
      .select('username, profile_picture_url')
      .in('username', usernames);

    // #region agent log
    logDebug({
      location: 'app/api/posts/route.ts:37',
      message: 'Fetched profile pictures for usernames',
      data: { usernames, usersCount: usersData?.length ?? 0 },
      hypothesisId: 'A',
    });
    // #endregion

    const profilePicturesMap = new Map(
      (usersData || []).map((user: any) => [user.username, user.profile_picture_url])
    );

    // Add profile picture URLs to posts
    const postsWithProfilePics = (data || []).map((post: any) => ({
      ...post,
      profile_picture_url: profilePicturesMap.get(post.usernamefk) || null,
    }));

    // #region agent log
    logDebug({
      location: 'app/api/posts/route.ts:46',
      message: 'Posts enriched with profile pictures',
      data: {
        count: postsWithProfilePics.length,
        first: postsWithProfilePics[0] ?? null,
        profilePicValues: postsWithProfilePics.map((p: any) => ({
          username: p.usernamefk,
          profile_picture_url: p.profile_picture_url,
        })),
      },
      hypothesisId: 'A',
    });
    // #endregion

    return NextResponse.json({ posts: postsWithProfilePics });
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
    console.error('POST error:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}