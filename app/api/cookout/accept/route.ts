import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

type Body = {
  invitation_id: number;
  username: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as Body;
    const { invitation_id, username } = body;

    if (!invitation_id || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Verify the user is a participant
    const { data: participant, error: checkError } = await supabase
      .from('cookout_participants')
      .select('invitation_id, username, status')
      .eq('invitation_id', invitation_id)
      .eq('username', username)
      .single();

    if (checkError || !participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Update status to accepted
    const { error: updateError } = await supabase
      .from('cookout_participants')
      .update({
        status: 'accepted',
        confirmed_at: new Date().toISOString(),
      })
      .eq('invitation_id', invitation_id)
      .eq('username', username);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

