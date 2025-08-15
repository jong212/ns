import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { NewsArticle } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cast = searchParams.get('cast');
    const source = searchParams.get('source');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 기본 쿼리 - solo_articles 테이블에서 데이터 조회
    let query = supabase
      .from('solo_articles')
      .select('*')
      .order('published_at', { ascending: false });

    // 필터 적용
    if (cast) {
      query = query.contains('cast_members', [cast]);
    }

    if (source) {
      query = query.eq('source', source);
    }

    if (from && to) {
      query = query.gte('published_at', from).lte('published_at', to);
    }

    // 페이지네이션 적용
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase 쿼리 오류:', error);
      return NextResponse.json({ 
        success: false,
        error: '데이터를 불러오는 중 오류가 발생했습니다.' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data as NewsArticle[],
      total: count || data?.length || 0,
      pagination: {
        limit,
        offset,
        hasMore: (data?.length || 0) === limit
      }
    });

  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ 
      success: false,
      error: '서버 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}
