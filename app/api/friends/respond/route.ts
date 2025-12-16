import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

type Body = {
  sender_username: string;
  receiver_username: string;
  action: 'accept' | 'decline';
};

export async function POST(request: Request) {
  try {
    const { sender_username, receiver_username, action } = (await request.json()) as Body;

    if (!sender_username || !receiver_username || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: 'Invalid action. Must be "accept" or "decline"' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Verify request exists and is pending
    const { data: friendRequest, error: requestError } = await supabase
      .from('friend_requests')
      .select('sender_username, receiver_username, status')
      .eq('sender_username', sender_username)
      .eq('receiver_username', receiver_username)
      .eq('status', 'pending')
      .maybeSingle();

    if (requestError) {
      return NextResponse.json({ error: 'Database error checking request' }, { status: 500 });
    }

    if (!friendRequest) {
      return NextResponse.json({ error: 'Friend request not found or already processed' }, { status: 404 });
    }

    if (action === 'accept') {
      // Create bidirectional friendship in friends table
      const { error: insertError1 } = await supabase
        .from('friends')
        .insert([{
          usernamefk_1: sender_username,
          usernamefk_2: receiver_username,
        }]);

      if (insertError1) {
        // Handle duplicate key error (already friends)
        if ((insertError1 as any).code !== '23505') {
          console.error('Error creating friendship:', insertError1);
          return NextResponse.json({ error: 'Failed to create friendship' }, { status: 500 });
        }
      }

      // Also insert reverse direction (bidirectional)
      const { error: insertError2 } = await supabase
        .from('friends')
        .insert([{
          usernamefk_1: receiver_username,
          usernamefk_2: sender_username,
        }]);

      if (insertError2) {
        // Handle duplicate key error (already friends)
        if ((insertError2 as any).code !== '23505') {
          console.error('Error creating reverse friendship:', insertError2);
          // Try to clean up the first insert if it succeeded
          await supabase
            .from('friends')
            .delete()
            .eq('usernamefk_1', sender_username)
            .eq('usernamefk_2', receiver_username);
          return NextResponse.json({ error: 'Failed to create friendship' }, { status: 500 });
        }
      }

      // Update request status to accepted
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('sender_username', sender_username)
        .eq('receiver_username', receiver_username);

      if (updateError) {
        console.error('Error updating request status:', updateError);
        // Don't fail the request if update fails, friendship is already created
      }

      return NextResponse.json({ success: true, message: 'Friend request accepted' });
    } else {
      // Decline: update status to declined
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'declined' })
        .eq('sender_username', sender_username)
        .eq('receiver_username', receiver_username);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to decline request' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Friend request declined' });
    }
  } catch (e) {
    console.error('Error responding to friend request:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

