import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const post_id = (body?.post_id || '').toString();
    const content = (body?.content || '').toString().trim();
    const nickname = (body?.nickname || '익명').toString().trim().slice(0, 20) || '익명';

    if (!post_id || content.length < 1) {
      return NextResponse.json({ success: false, error: '입력값 오류' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id, content, nickname })
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: '댓글 작성 실패' }, { status: 500 });
  }
}


