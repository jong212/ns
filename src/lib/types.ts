// 뉴스 기사 타입 정의
export interface NewsArticle {
  id: string;
  title: string;
  article_url: string;
  canonical_url?: string;
  source?: string;
  summary?: string;
  thumbnail_url?: string;
  author?: string;
  published_at?: string;
  fetched_at?: string;
  created_at?: string;
  status?: string;
  raw_meta?: any;
  hash?: string;
  
  // 나는솔로 전용 필드
  cluster_id?: string;
  keywords?: string[];
  cast_members?: string[];
}

// API 응답 타입
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
  message?: string;
}

// 뉴스 클러스터 타입
export interface NewsCluster {
  id: string;
  main_article: NewsArticle;
  related_articles: NewsArticle[];
}

// 페이지네이션 타입
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// 필터링 옵션
export interface NewsFilters {
  cast?: string;
  source?: string;
  from?: string;
  to?: string;
  keywords?: string[];
}
