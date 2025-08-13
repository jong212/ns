import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore - Deno 환경에서 정상 작동
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// VSCode TypeScript 편집기용 타입 보정(런타임 영향 없음)
// Edge 런타임에서는 전역 Deno가 주입되므로 선언만 제공
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

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
  content_hash?: string; // 제목+요약 기반 해시
}

interface FunctionLog {
  id?: string;
  function_name: string;
  status: 'success' | 'error';
  execution_time: number;
  error_message?: string;
  created_at?: string;
}

// 중복 판정 파라미터
const MAX_COMPARE = 300; // 하루치 비교 상한
const RECENT_HOURS = 24;

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

// 필수 환경변수 조회(없으면 즉시 오류)
function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`${key} 시크릿이 설정되어 있지 않습니다`);
  return value;
}

// 출연자 추출 함수
function extractCastMembers(text: string): string[] {
  const castMembers: string[] = [];
  
  // 실제 나는솔로 출연자 목록
  const actualCastMembers = [
    '영수', '영호', '영식', '영철', '광수', '상철',
    '순자', '영자', '정숙', '영숙', '옥순', '현숙'
  ];
  
  // 텍스트에서 실제 출연자 이름 찾기
  actualCastMembers.forEach(member => {
    if (text.includes(member)) {
      castMembers.push(member);
    }
  });
  
  // 패턴 1: "씨", "님" 호칭이 있는 이름
  const honorificPatterns = [
    /[가-힣]{2,4}\s*씨/g,
    /[가-힣]{2,4}\s*님/g,
  ];
  
  // 패턴 2: "27기", "XX기" 다음에 오는 이름들
  const seasonPatterns = [
    /[0-9]+기\s*([가-힣]{2,4})/g,
    /[0-9]+기\s*([가-힣]{2,4})\s*[가-힣]{2,4}/g,
  ];
  
  // 패턴 3: 문맥상 출연자로 보이는 이름들 (콤마, 공백으로 구분)
  const contextPatterns = [
    /([가-힣]{2,4}),\s*([가-힣]{2,4})/g,
    /([가-힣]{2,4})\s*[가-힣]{2,4}\s*([가-힣]{2,4})/g,
  ];
  
  // 패턴 4: 따옴표 안의 이름들
  const quotePatterns = [
    /["""]([가-힣]{2,4})["""]/g,
  ];
  
  // 호칭이 있는 이름 추출
  honorificPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      const names = matches.map(m => m.replace(/\s*(씨|님)/g, ''));
      // 실제 출연자 목록에 있는 이름만 추가
      names.forEach(name => {
        if (actualCastMembers.includes(name)) {
          castMembers.push(name);
        }
      });
    }
  });
  
  // 시즌 패턴에서 이름 추출
  seasonPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && actualCastMembers.includes(match[1])) {
        castMembers.push(match[1]);
      }
      if (match[2] && actualCastMembers.includes(match[2])) {
        castMembers.push(match[2]);
      }
    }
  });
  
  // 문맥상 출연자로 보이는 이름들
  contextPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && actualCastMembers.includes(match[1])) {
        castMembers.push(match[1]);
      }
      if (match[2] && actualCastMembers.includes(match[2])) {
        castMembers.push(match[2]);
      }
    }
  });
  
  // 따옴표 안의 이름들
  quotePatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && actualCastMembers.includes(match[1])) {
        castMembers.push(match[1]);
      }
    }
  });
  
  // 중복 제거
  return [...new Set(castMembers)];
}

// 해시 생성 함수
async function generateHash(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 제목+요약 기반 해시 생성 (중복 판정용)
async function generateContentHash(title: string, summary?: string): Promise<string> {
  const content = `${title}\n${summary ?? ''}`.trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
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

// 최근 24시간 기사와 제목+요약 해시 비교로 중복 판정
async function shouldSkipByContentHash(supabase: any, contentHash: string): Promise<boolean> {
  const sinceIso = new Date(Date.now() - RECENT_HOURS * 3600 * 1000).toISOString();
  
  const { data: recent, error } = await supabase
    .from('articles')
    .select('id, content_hash, published_at')
    .gte('published_at', sinceIso)
    .order('published_at', { ascending: false })
    .limit(MAX_COMPARE);
    
  if (error) {
    console.warn('최근 기사 조회 실패(중복 비교 생략):', error);
    return false;
  }

  // 동일한 content_hash가 있는지 확인
  for (const article of recent ?? []) {
    if (article.content_hash === contentHash) {
      console.log('중복 기사 발견 (content_hash 일치):', article.id);
      return true;
    }
  }
  
  return false;
}

// 관련 기사 판별(제목/요약 기반)
function isRelevantToShow(title: string, summary?: string): boolean {
  const text = `${title} ${summary ?? ''}`
    .replace(/\s+/g, ' ')
    .toLowerCase();
  // 반드시 "나는솔로"(공백 허용) 또는 "나솔" 포함, 단순 "솔로"만은 제외
  if (/(나는\s*솔로)/.test(text)) return true;
  if (/(^|\s)나솔(\s|$)/.test(text)) return true;
  return false;
}

// 썸네일 보강 함수 트리거(권한 헤더 포함, REST 폴백)
async function triggerEnrichThumbnails(supabase: any, limit: number): Promise<void> {
  const supabaseUrl = getRequiredEnv('SUPABASE_URL');
  const supabaseKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  console.log('enrich-thumbnails 호출 시도 (limit:', limit, ')');
  try {
    const { error } = await supabase.functions.invoke('enrich-thumbnails', {
      body: { limit },
      headers: { Authorization: `Bearer ${supabaseKey}` }
    });
    if (error) throw error;
    console.log('enrich-thumbnails 트리거 완료 (invoke)');
  } catch (e) {
    console.warn('enrich-thumbnails invoke 실패, REST로 재시도:', e);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/enrich-thumbnails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit })
      });
      console.log('enrich-thumbnails 트리거 완료 (REST) status:', res.status);
    } catch (e2) {
      console.warn('enrich-thumbnails 트리거 최종 실패(무시):', e2);
    }
  }
}

// 키워드 단위 네이버 수집 처리
async function collectForKeyword(
  naverClientId: string,
  naverClientSecret: string,
  keyword: string,
  supabase: any
): Promise<NewsArticle[]> {
  const results: NewsArticle[] = [];
  console.log(`키워드 '${keyword}' 검색 시작`);
  
  const response = await fetch(
    `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(keyword)}&display=10&sort=date`,
    { headers: { 'X-Naver-Client-Id': naverClientId, 'X-Naver-Client-Secret': naverClientSecret } }
  );
  
  if (!response.ok) {
    console.error(`네이버 API 오류 (${keyword}):`, response.status, response.statusText);
    return results;
  }
  
  const data = await response.json();
  console.log(`키워드 '${keyword}' 검색 결과:`, data.total, '개');

  for (const item of data.items) {
    const articleUrl = item.originallink || item.link;
    const cleanTitle = decodeHtmlEntities(item.title.replace(/<[^>]*>/g, ''));
    const cleanSummary = decodeHtmlEntities(item.description.replace(/<[^>]*>/g, '')).substring(0, 150);
    const castMembers = extractCastMembers(cleanTitle + ' ' + cleanSummary);
    
    if (!isRelevantToShow(cleanTitle, cleanSummary)) continue;
    
    const hash = await generateHash(articleUrl);
    const contentHash = await generateContentHash(cleanTitle, cleanSummary);
    
    // content_hash 기반 중복 확인
    const isDuplicate = await shouldSkipByContentHash(supabase, contentHash);
    if (isDuplicate) {
      console.log('중복 기사 스킵:', cleanTitle);
      continue;
    }
    
    results.push({
      title: cleanTitle,
      article_url: articleUrl,
      source: extractSource(articleUrl),
      published_at: new Date(item.pubDate).toISOString(),
      thumbnail_url: null,
      summary: cleanSummary,
      keywords: [keyword],
      cast_members: castMembers,
      status: 'collected',
      hash,
      content_hash: contentHash
    });
  }
  
  return results;
}

// 뉴스 수집 함수
async function fetchNaverNews(supabase: any): Promise<{ success: boolean; collected: number; saved: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    // 네이버 API 키 (환경변수에서 가져오기)
    const naverClientId = getRequiredEnv('NAVER_CLIENT_ID');
    const naverClientSecret = getRequiredEnv('NAVER_CLIENT_SECRET');

    // 검색 키워드(정확도 우선)
    const keywords = ['나는솔로', '나솔'];
    const allArticles: NewsArticle[] = [];

    console.log('뉴스 수집 시작');

    for (const keyword of keywords) {
      try {
        const items = await collectForKeyword(naverClientId, naverClientSecret, keyword, supabase);
        allArticles.push(...items);
      } catch (error) {
        console.error(`키워드 '${keyword}' 수집 오류:`, error);
      }
    }

    // URL 기반 중복 제거 (2차)
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

    const thumbLimit = Math.max(1, Math.min(50, data?.length ?? uniqueArticles.length));
    await triggerEnrichThumbnails(supabase, thumbLimit);

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
    // supabase 인스턴스 생성 이전 오류 가능성 때문에 방어
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const sb = createClient(supabaseUrl, supabaseKey);
      await saveLog(sb, {
        function_name: 'scheduled-news-fetch',
        status: 'error',
        execution_time: executionTime,
        error_message: error instanceof Error ? error.message : String(error),
        created_at: new Date().toISOString()
      });
    } catch {}

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
    // 모든 요청 허용 (인증 제거)
    console.log('Edge Function 호출됨 - 모든 요청 허용');
    
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
