import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

type Body = {
  comment_id: number;
  user_id: string; // username
};

export async function POST(request: Request) {
  try {
    const { comment_id, user_id } = (await request.json()) as Body;

    if (!comment_id || !user_id) {
      return NextResponse.json({ error: 'Comment ID and user ID required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Verify the comment belongs to the user
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('comment_id', comment_id)
      .maybeSingle();

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.user_id !== user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('comment_id', comment_id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE error:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}