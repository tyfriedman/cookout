import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Get friends where user is usernamefk_1
    const { data: friends1, error: error1 } = await supabase
      .from('friends')
      .select('usernamefk_2')
      .eq('usernamefk_1', username);

    if (error1) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Get friends where user is usernamefk_2
    const { data: friends2, error: error2 } = await supabase
      .from('friends')
      .select('usernamefk_1')
      .eq('usernamefk_2', username);

    if (error2) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Collect all friend usernames
    const friendUsernames = new Set<string>();
    (friends1 || []).forEach((f: any) => friendUsernames.add(f.usernamefk_2));
    (friends2 || []).forEach((f: any) => friendUsernames.add(f.usernamefk_1));

    if (friendUsernames.size === 0) {
      return NextResponse.json({ friends: [] });
    }

    // Fetch user data for all friends
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('username, firstname, lastname, profile_picture_url')
      .in('username', Array.from(friendUsernames));

    if (usersError) {
      return NextResponse.json({ error: 'Database error fetching users' }, { status: 500 });
    }

    // Format friends list
    const friendsList: Array<{
      username: string;
      firstname: string | null;
      lastname: string | null;
      profile_picture_url: string | null;
    }> = (usersData || []).map((user: any) => ({
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      profile_picture_url: user.profile_picture_url,
    }));

    // Remove duplicates (shouldn't happen but just in case)
    const uniqueFriends = Array.from(
      new Map(friendsList.map(f => [f.username, f])).values()
    );

    return NextResponse.json({ friends: uniqueFriends });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

