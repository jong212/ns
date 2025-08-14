import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { data: post, error: e1 } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();
    if (e1) throw e1;

    const { data: comments, error: e2 } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', id)
      .order('created_at', { ascending: false });
    if (e2) throw e2;

    return NextResponse.json({ success: true, data: { post, comments: comments || [] } });
  } catch (e) {
    return NextResponse.json({ success: false, error: '상세 조회 실패' }, { status: 500 });
  }
}


