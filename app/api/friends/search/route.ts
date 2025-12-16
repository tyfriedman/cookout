import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const query = searchParams.get('query');

    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    if (!query || query.trim() === '') {
      return NextResponse.json({ users: [] });
    }

    const supabase = getSupabaseServerClient();

    // Get current user's friends
    const { data: friends1, error: friendsError1 } = await supabase
      .from('friends')
      .select('usernamefk_2')
      .eq('usernamefk_1', username);

    const { data: friends2, error: friendsError2 } = await supabase
      .from('friends')
      .select('usernamefk_1')
      .eq('usernamefk_2', username);

    if (friendsError1 || friendsError2) {
      return NextResponse.json({ error: 'Database error fetching friends' }, { status: 500 });
    }

    const friendUsernames = new Set<string>();
    (friends1 || []).forEach((f: any) => friendUsernames.add(f.usernamefk_2));
    (friends2 || []).forEach((f: any) => friendUsernames.add(f.usernamefk_1));
    friendUsernames.add(username); // Also exclude current user

    // Search for users matching query
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('username, firstname, lastname, profile_picture_url')
      .ilike('username', `%${query.trim()}%`)
      .limit(20);

    if (usersError) {
      return NextResponse.json({ error: 'Database error searching users' }, { status: 500 });
    }

    // Filter out current user and existing friends
    const filteredUsers = (users || []).filter(
      (u: any) => !friendUsernames.has(u.username)
    );

    return NextResponse.json({ users: filteredUsers });
  } catch (e) {
    console.error('Error searching users:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

