import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore - Deno 환경에서 정상 작동
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Deno 전역 타입 선언
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

// CORS 정책 완화 - 모든 도메인 허용
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Max-Age': '86400',
};

interface NewsArticle {
  id?: string;
  title: string;
  article_url: string;
  source: string;
  published_at: string;
  thumbnail_url?: string | null; // null 허용
  cluster_id?: string;
  summary?: string;
  keywords?: string[];
  cast_members?: string[];
  status?: string;
  hash?: string;
}

interface FunctionLog {
  id?: string;
  function_name: string;
  status: 'success' | 'error';
  execution_time: number;
  error_message?: string;
  created_at?: string;
}

// HTML 엔티티 디코딩 함수
function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// 출연자 추출 함수
function extractCastMembers(text: string): string[] {
  const castMembers: string[] = [];
  const patterns = [
    /[가-힣]{2,4}\s*씨/g,
    /[가-힣]{2,4}\s*님/g,
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      castMembers.push(...matches.map(m => m.replace(/\s*(씨|님)/g, '')));
    }
  });
  
  return [...new Set(castMembers)]; // 중복 제거
}

// 해시 생성 함수
async function generateHash(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// URL에서 도메인 추출
function extractSource(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '').split('.')[0];
  } catch {
    return 'unknown';
  }
}

// 중복 제거 함수
function deduplicateByUrl(articles: NewsArticle[]): NewsArticle[] {
  const seenUrls = new Set<string>();
  const uniqueArticles: NewsArticle[] = [];
  
  for (const article of articles) {
    if (!seenUrls.has(article.article_url)) {
      seenUrls.add(article.article_url);
      uniqueArticles.push(article);
    }
  }
  
  return uniqueArticles;
}

// 로그 저장 함수
async function saveLog(supabase: any, log: FunctionLog): Promise<void> {
  try {
    await supabase
      .from('function_logs')
      .insert(log);
  } catch (error) {
    console.error('로그 저장 실패:', error);
  }
}

// 뉴스 수집 함수
async function fetchNaverNews(supabase: any): Promise<{ success: boolean; collected: number; saved: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    // 네이버 API 키 (환경변수에서 가져오기)
    const naverClientId = Deno.env.get('NAVER_CLIENT_ID') || 'N3frPLJKZ5z22Vo4pix1';
    const naverClientSecret = Deno.env.get('NAVER_CLIENT_SECRET') || 'akaQ8GVzRj';

    const keywords = ['나는솔로', '나는 솔로', '나솔'];
    const allArticles: NewsArticle[] = [];

    console.log('뉴스 수집 시작');

    for (const keyword of keywords) {
      try {
        console.log(`키워드 '${keyword}' 검색 시작`);
        
        const response = await fetch(
          `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(keyword)}&display=10&sort=date`,
          {
            headers: {
              'X-Naver-Client-Id': naverClientId,
              'X-Naver-Client-Secret': naverClientSecret,
            },
          }
        );

        if (!response.ok) {
          console.error(`네이버 API 오류 (${keyword}):`, response.status, response.statusText);
          continue;
        }

        const data = await response.json();
        console.log(`키워드 '${keyword}' 검색 결과:`, data.total, '개');

        for (const item of data.items) {
          const articleUrl = item.originallink || item.link;
          
          // HTML 태그 제거
          const cleanTitle = decodeHtmlEntities(item.title.replace(/<[^>]*>/g, ''));
          const cleanSummary = decodeHtmlEntities(item.description.replace(/<[^>]*>/g, '')).substring(0, 150);
          
          // 출연자 추출
          const castMembers = extractCastMembers(cleanTitle + ' ' + cleanSummary);
          
          // 해시 생성
          const hash = await generateHash(articleUrl);
          
          const article: NewsArticle = {
            title: cleanTitle,
            article_url: articleUrl,
            source: extractSource(articleUrl),
            published_at: new Date(item.pubDate).toISOString(),
            thumbnail_url: null,
            summary: cleanSummary,
            keywords: [keyword],
            cast_members: castMembers,
            status: 'collected',
            hash: hash
          };

          allArticles.push(article);
        }
      } catch (error) {
        console.error(`키워드 '${keyword}' 수집 오류:`, error);
        continue;
      }
    }

    // 중복 제거
    const uniqueArticles = deduplicateByUrl(allArticles);
    console.log('총 수집된 기사 수:', allArticles.length);
    console.log('중복 제거 후 기사 수:', uniqueArticles.length);

    // 데이터베이스에 저장
    const { data, error } = await supabase
      .from('articles')
      .upsert(uniqueArticles, { onConflict: 'article_url' })
      .select();

    if (error) {
      console.error('데이터베이스 오류:', error);
      throw new Error(`데이터베이스 저장 실패: ${error.message}`);
    }

    const executionTime = Date.now() - startTime;
    console.log('데이터베이스 저장 완료:', data?.length, '개');

    // 성공 로그 저장
    await saveLog(supabase, {
      function_name: 'scheduled-news-fetch',
      status: 'success',
      execution_time: executionTime,
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      collected: allArticles.length,
      saved: data?.length || 0
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('뉴스 수집 실패:', error);
    
    // 오류 로그 저장
    await saveLog(supabase, {
      function_name: 'scheduled-news-fetch',
      status: 'error',
      execution_time: executionTime,
      error_message: error instanceof Error ? error.message : String(error),
      created_at: new Date().toISOString()
    });

    return {
      success: false,
      collected: 0,
      saved: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 스케줄링 인증 확인 (Supabase Cron에서 호출할 때)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('인증 헤더 없음 - 스케줄링 호출이 아닙니다');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Supabase 클라이언트 설정
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('스케줄링 뉴스 수집 작업 시작');

    // 뉴스 수집 실행
    const result = await fetchNaverNews(supabase);

    if (result.success) {
      console.log('스케줄링 뉴스 수집 작업 완료');
      return new Response(JSON.stringify({
        success: true,
        collected: result.collected,
        saved: result.saved,
        message: `뉴스 수집 완료: ${result.saved}개 저장됨`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      console.error('스케줄링 뉴스 수집 작업 실패:', result.error);
      return new Response(JSON.stringify({
        success: false,
        error: result.error,
        message: '뉴스 수집 중 오류가 발생했습니다'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Edge Function 오류:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage,
      message: '서버 오류가 발생했습니다'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
