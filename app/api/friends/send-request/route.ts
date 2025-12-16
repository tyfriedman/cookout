import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

type Body = {
  sender_username: string;
  receiver_username: string;
};

export async function POST(request: Request) {
  try {
    const { sender_username, receiver_username } = (await request.json()) as Body;

    if (!sender_username || !receiver_username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (sender_username === receiver_username) {
      return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Check if users exist
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('username')
      .eq('username', sender_username)
      .maybeSingle();

    if (senderError || !sender) {
      return NextResponse.json({ error: 'Sender user not found' }, { status: 404 });
    }

    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('username')
      .eq('username', receiver_username)
      .maybeSingle();

    if (receiverError || !receiver) {
      return NextResponse.json({ error: 'Receiver user not found' }, { status: 404 });
    }

    // Check if they are already friends
    const { data: existingFriendship, error: friendCheckError } = await supabase
      .from('friends')
      .select('usernamefk_1, usernamefk_2')
      .or(`and(usernamefk_1.eq.${sender_username},usernamefk_2.eq.${receiver_username}),and(usernamefk_1.eq.${receiver_username},usernamefk_2.eq.${sender_username})`)
      .maybeSingle();

    if (friendCheckError) {
      return NextResponse.json({ error: 'Database error checking friendship' }, { status: 500 });
    }

    if (existingFriendship) {
      return NextResponse.json({ error: 'Users are already friends' }, { status: 400 });
    }

    // Check if request already exists
    const { data: existingRequest, error: requestCheckError } = await supabase
      .from('friend_requests')
      .select('sender_username, receiver_username, status')
      .eq('sender_username', sender_username)
      .eq('receiver_username', receiver_username)
      .maybeSingle();

    if (requestCheckError) {
      return NextResponse.json({ error: 'Database error checking request' }, { status: 500 });
    }

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return NextResponse.json({ error: 'Friend request already sent' }, { status: 400 });
      }
      // If declined, update to pending
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'pending', created_at: new Date().toISOString() })
        .eq('sender_username', sender_username)
        .eq('receiver_username', receiver_username);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Friend request sent' });
    }

    // Create new request
    const { error: insertError } = await supabase
      .from('friend_requests')
      .insert([{
        sender_username,
        receiver_username,
        status: 'pending',
      }]);

    if (insertError) {
      // Handle duplicate key error gracefully
      if ((insertError as any).code === '23505') {
        return NextResponse.json({ error: 'Friend request already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to send friend request' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Friend request sent' });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

