'use client';

import { useState, useEffect } from 'react';
import { NewsArticle, APIResponse, NewsFilters } from '@/lib/types';

interface UseNewsOptions extends NewsFilters {
  limit?: number;
  offset?: number;
}

interface UseNewsReturn {
  articles: NewsArticle[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useNews(options: UseNewsOptions = {}): UseNewsReturn {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);

  const limit = options.limit || 20;

  const fetchNews = async (offset: number = 0, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      // 필터 파라미터 추가
      if (options.cast) params.set('cast', options.cast);
      if (options.source) params.set('source', options.source);
      if (options.from) params.set('from', options.from);
      if (options.to) params.set('to', options.to);
      
      // 페이지네이션 파라미터
      params.set('limit', limit.toString());
      params.set('offset', offset.toString());

      const response = await fetch(`/api/feed?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: APIResponse<NewsArticle[]> = await response.json();
      
      if (result.success && result.data) {
        if (append) {
          setArticles(prev => [...prev, ...result.data!]);
        } else {
          setArticles(result.data);
        }
        setTotal(result.total || 0);
        setHasMore(result.data.length === limit);
        setCurrentOffset(offset + result.data.length);
      } else {
        setError(result.error || '데이터를 불러올 수 없습니다');
      }
    } catch (err) {
      console.error('뉴스 데이터 로딩 오류:', err);
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    setCurrentOffset(0);
    await fetchNews(0, false);
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;
    await fetchNews(currentOffset, true);
  };

  useEffect(() => {
    fetchNews();
  }, [options.cast, options.source, options.from, options.to, limit]);

  return {
    articles,
    loading,
    error,
    total,
    hasMore,
    refetch,
    loadMore
  };
}
