import { NewsArticle } from '@/lib/types';

export const CAST_CATEGORIES: string[] = [
  '영수', '영호', '영식', '영철', '광수', '상철',
  '순자', '영자', '정숙', '영숙', '옥순', '현숙',
];

export function matchesCast(article: NewsArticle, cast: string): boolean {
  if (!cast) return true;
  const haystacks: string[] = [];
  if (article.title) haystacks.push(article.title);
  if (article.summary) haystacks.push(article.summary);
  if (article.source) haystacks.push(article.source);
  if (article.keywords && article.keywords.length > 0) {
    haystacks.push(article.keywords.join(' '));
  }
  if (article.cast_members && article.cast_members.length > 0) {
    if (article.cast_members.includes(cast)) return true;
  }
  return haystacks.some((t) => t.includes(cast));
}


