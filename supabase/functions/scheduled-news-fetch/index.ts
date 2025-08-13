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
  embedding?: number[]; // 임베딩(중복 판정 및 저장용)
}

interface FunctionLog {
  id?: string;
  function_name: string;
  status: 'success' | 'error';
  execution_time: number;
  error_message?: string;
  created_at?: string;
}

// 임베딩 기반 중복 판정 파라미터 (Hugging Face 전환)
const SIM_THRESHOLD = 0.86; // MiniLM 계열 기준 권장값(운영 중 튜닝 0.82~0.87)
const MAX_COMPARE = 300; // 하루치 비교 상한
const RECENT_HOURS = 24;
// Hugging Face 임베딩 모델(단일, feature-extraction 전용 사용)
const HF_MODEL_ID = 'thenlper/gte-small'; // 384d
const EMBEDDING_DIM = 384; // DB 스키마와 일치해야 함

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

// 코사인 유사도
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

async function embedText(text: string): Promise<number[] | null> {
  const token = Deno.env.get('HUGGINGFACE_API_TOKEN');
  if (!token) { console.warn('HUGGINGFACE_API_TOKEN 없음'); return null; }
  const t = text.trim().slice(0, 800);
  if (!t) return null;

  // 우선권: models 엔드포인트 (권장)
  const primaryModel = HF_MODEL_ID; // thenlper/gte-small
  const secondaryModel = 'sentence-transformers/all-MiniLM-L6-v2'; // 광범위 지원 모델(384d)

  async function callModels(modelId: string) {
    return fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: t, options: { wait_for_model: true } }),
    });
  }
  async function callFeatureExtraction(modelId: string) {
    return fetch(`https://api-inference.huggingface.co/pipeline/feature-extraction/${modelId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: t, options: { wait_for_model: true } }),
    });
  }

  let r = await callModels(primaryModel);
  if (!r.ok) {
    const b1 = await r.text().catch(() => '');
    // 2차: 보편 모델(models)
    let r2 = await callModels(secondaryModel);
    if (!r2.ok) {
      const b2 = await r2.text().catch(() => '');
      // 3차: primary feature-extraction
      let r3 = await callFeatureExtraction(primaryModel);
      if (!r3.ok) {
        const b3 = await r3.text().catch(() => '');
        // 4차: secondary feature-extraction
        let r4 = await callFeatureExtraction(secondaryModel);
        if (!r4.ok) {
          const b4 = await r4.text().catch(() => '');
          console.warn('HuggingFace 응답 오류:', r.status, r.statusText, b1?.slice(0,300), '| m2:', r2.status, r2.statusText, b2?.slice(0,300), '| fe1:', r3.status, r3.statusText, b3?.slice(0,300), '| fe2:', r4.status, r4.statusText, b4?.slice(0,300));
          return null;
        }
        r = r4;
      } else {
        r = r3;
      }
    } else {
      r = r2;
    }
  }
  const out = await r.json();
  const vec = Array.isArray(out) && Array.isArray(out[0])
    ? out[0].map((_: any, i: number) => out.reduce((s: number, tv: number[]) => s + tv[i], 0) / out.length)
    : (out as number[]);
  if (!Array.isArray(vec)) return null;
  return vec.length > EMBEDDING_DIM
    ? vec.slice(0, EMBEDDING_DIM)
    : vec.concat(Array(Math.max(0, EMBEDDING_DIM - vec.length)).fill(0));
}

// 최근 24시간 기사와 임베딩 유사도 비교로 중복 판정
async function shouldSkipByEmbedding(supabase: any, title: string, summary?: string): Promise<{ skip: boolean; embedding?: number[] }> {
  const text = `${title}\n${summary ?? ''}`.slice(0, 800);
  const emb = await embedText(text);
  if (!emb) return { skip: false, embedding: undefined };

  const sinceIso = new Date(Date.now() - RECENT_HOURS * 3600 * 1000).toISOString();
  const { data: recent, error } = await supabase
    .from('articles')
    .select('id, embedding, published_at')
    .gte('published_at', sinceIso)
    .order('published_at', { ascending: false })
    .limit(MAX_COMPARE);
  if (error) {
    console.warn('최근 기사 조회 실패(임베딩 비교 생략):', error);
    return { skip: false, embedding: emb };
  }

  let maxSim = 0;
  for (const r of recent ?? []) {
    const vec = (r as any)?.embedding as number[] | undefined;
    if (!vec || !Array.isArray(vec)) continue;
    const sim = cosineSimilarity(emb, vec);
    if (sim > maxSim) maxSim = sim;
    if (sim >= SIM_THRESHOLD) {
      return { skip: true, embedding: emb };
    }
  }
  return { skip: false, embedding: emb };
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
    const dupCheck = await shouldSkipByEmbedding(supabase, cleanTitle, cleanSummary);
    if (dupCheck.skip) continue;
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
      embedding: dupCheck.embedding
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
