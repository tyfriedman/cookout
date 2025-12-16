import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const type = searchParams.get('type'); // 'sent' | 'received'

    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    if (!type || (type !== 'sent' && type !== 'received')) {
      return NextResponse.json({ error: 'Invalid type. Must be "sent" or "received"' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    let query;
    if (type === 'sent') {
      query = supabase
        .from('friend_requests')
        .select('sender_username, receiver_username, status, created_at')
        .eq('sender_username', username)
        .eq('status', 'pending');
    } else {
      query = supabase
        .from('friend_requests')
        .select('sender_username, receiver_username, status, created_at')
        .eq('receiver_username', username)
        .eq('status', 'pending');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Fetch user data for each request
    const requests = await Promise.all(
      (data || []).map(async (req: any) => {
        const targetUsername = type === 'sent' ? req.receiver_username : req.sender_username;
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('username, firstname, lastname, profile_picture_url')
          .eq('username', targetUsername)
          .maybeSingle();

        if (userError) {
          // Error fetching user, use default values
        }

        return {
          sender_username: req.sender_username,
          receiver_username: req.receiver_username,
          status: req.status,
          created_at: req.created_at,
          user: userData || {
            username: targetUsername,
            firstname: null,
            lastname: null,
            profile_picture_url: null,
          },
        };
      })
    );

    return NextResponse.json({ requests });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

