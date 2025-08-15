import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const { data, error } = await supabase
      .from('solo_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] });
  } catch (e) {
    return NextResponse.json({ success: false, error: '목록 조회 실패' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = (body?.title || '').toString().trim();
    const content = (body?.content || '').toString().trim();
    const nickname = (body?.nickname || '익명').toString().trim().slice(0, 20) || '익명';

    if (title.length < 2 || content.length < 5) {
      return NextResponse.json({ success: false, error: '제목/내용이 너무 짧습니다' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('solo_posts')
      .insert({ title, content, nickname })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: '작성 실패' }, { status: 500 });
  }
}


