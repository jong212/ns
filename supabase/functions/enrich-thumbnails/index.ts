import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore - Deno 환경에서 정상 작동
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Deno 전역 타입 선언
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Max-Age': '86400',
};

interface ArticleRow {
  id: string;
  article_url: string;
}

function toAbsoluteUrl(possibleUrl: string, baseUrl: string): string | null {
  try {
    if (!possibleUrl) return null;
    if (possibleUrl.startsWith('http://') || possibleUrl.startsWith('https://')) return possibleUrl;
    if (possibleUrl.startsWith('//')) return `https:${possibleUrl}`;
    const base = new URL(baseUrl);
    if (possibleUrl.startsWith('/')) return `${base.protocol}//${base.host}${possibleUrl}`;
    return `${base.protocol}//${base.host}/${possibleUrl.replace(/^\./, '')}`;
  } catch {
    return null;
  }
}

function extractThumbnailFromHtml(html: string, pageUrl: string): string | null {
  const metaKeys = [
    'og:image',
    'og:image:secure_url',
    'twitter:image',
    'twitter:image:src'
  ];

  for (const key of metaKeys) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i');
    const m = html.match(re);
    if (m && m[1]) {
      const abs = toAbsoluteUrl(m[1], pageUrl);
      if (abs) return abs;
    }
  }

  // 일반 이미지 태그 fallback (data:, 1x1 추정 제외)
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (imgMatch && imgMatch[1]) {
    const abs = toAbsoluteUrl(imgMatch[1], pageUrl);
    if (abs && !abs.startsWith('data:')) return abs;
  }

  return null;
}

async function fetchThumbnail(articleUrl: string, timeoutMs = 10000): Promise<string | null> {
  try {
    const res = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
      },
      signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(timeoutMs) : undefined
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractThumbnailFromHtml(html, articleUrl);
  } catch {
    return null;
  }
}

async function enrichBatch(supabase: any, limit = 20): Promise<{ scanned: number; updated: number; failed: number } | { error: string } > {
  // 처리 대상: 썸네일 미지정 + 실패 이력 없음
  const { data: rows, error: selectError } = await supabase
    .from('articles')
    .select('id, article_url')
    .is('thumbnail_url', null)
    .or('thumbnail_status.is.null,thumbnail_status.eq.')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (selectError) return { error: `select error: ${selectError.message}` };
  if (!rows || rows.length === 0) return { scanned: 0, updated: 0, failed: 0 };

  const concurrency = 5;
  const updates: { id: string; thumbnail_url: string }[] = [];
  const failures: string[] = [];

  for (let i = 0; i < rows.length; i += concurrency) {
    const chunk = rows.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (row: ArticleRow) => {
        const thumb = await fetchThumbnail(row.article_url);
        if (thumb) return { id: row.id, thumbnail_url: thumb };
        failures.push(row.id);
        return null;
      })
    );
    for (const r of results) if (r) updates.push(r);
  }

  let updated = 0;
  if (updates.length > 0) {
    const chunkSize = 5;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map(async (u) => {
          const { data, error } = await supabase
            .from('articles')
            .update({ thumbnail_url: u.thumbnail_url, thumbnail_status: 'success' })
            .eq('id', u.id)
            .select('id');
          if (!error) return data?.length || 0;
          return 0;
        })
      );
      updated += results.reduce((a, b) => a + b, 0);
    }
  }

  let failed = 0;
  if (failures.length > 0) {
    const chunkSize = 10;
    for (let i = 0; i < failures.length; i += chunkSize) {
      const chunk = failures.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from('articles')
        .update({ thumbnail_status: 'failed' })
        .in('id', chunk)
        .select('id');
      if (!error) failed += data?.length || 0;
    }
  }

  return { scanned: rows.length, updated, failed };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const limit = typeof body.limit === 'number' && body.limit > 0 && body.limit <= 100 ? body.limit : 20;

    const started = Date.now();
    const res = await enrichBatch(supabase, limit);
    const ms = Date.now() - started;

    if ('error' in res) {
      return new Response(JSON.stringify({ success: false, ...res, elapsed_ms: ms }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, ...res, elapsed_ms: ms }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
