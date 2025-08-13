"use client";
import { NewsArticle } from '@/lib/types';
import { formatDistanceToNow, extractDomain, truncateText } from '@/lib/utils';
import Image from 'next/image';
import { BookmarkPlus } from 'lucide-react';
import { useCallback } from 'react';
import { useFavorites } from '@/hooks/useFavorites';

interface NewsCardProps {
  article: NewsArticle;
  onClick?: (article: NewsArticle) => void;
}

export function NewsCard({ article, onClick }: NewsCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();

  const handleBookmark = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // 토글 로컬 즐겨찾기 (브라우저 저장)
      toggleFavorite(article);

      // 브라우저 북마크 시도: 대부분의 현대 브라우저는 자동 추가를 막음
      // 사용자에게 단축키 안내 및 URL 복사 제공
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const shortcut = isMac ? 'Cmd + D' : 'Ctrl + D';
      await navigator.clipboard.writeText(article.article_url);
      // 간단 안내
      alert(`북마크를 추가하려면 ${shortcut} 를 눌러주세요.\n링크가 클립보드에 복사되었습니다.`);
    } catch {
      // Clipboard 실패 시에도 안내만 표시
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const shortcut = isMac ? 'Cmd + D' : 'Ctrl + D';
      alert(`북마크를 추가하려면 ${shortcut} 를 눌러주세요.`);
    }
  }, [article, toggleFavorite]);
  const handleClick = () => {
    if (onClick) {
      onClick(article);
    } else {
      // 기본 동작: 새 탭에서 기사 열기
      window.open(article.article_url, '_blank');
    }
  };

  return (
    <div 
      className="group relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-white/20 overflow-hidden transform hover:-translate-y-2"
      onClick={handleClick}
    >
      {/* 그라데이션 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* 썸네일 이미지 */}
                  <div className="relative w-full h-48 overflow-hidden">
              {article.thumbnail_url ? (
                <Image
                  src={article.thumbnail_url}
                  alt={article.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onError={(e) => {
                    // 이미지 로드 실패 시 기본 이미지로 대체
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-full bg-gradient-to-br from-pink-100 via-purple-100 to-pink-200 flex items-center justify-center">
                          <div class="text-center">
                            <div class="text-4xl mb-2">📰</div>
                            <div class="text-sm text-gray-600 font-medium">나는솔로 뉴스</div>
                          </div>
                        </div>
                      `;
                    }
                  }}
                />
              ) : (
                // 썸네일이 없는 경우 기본 이미지 표시 (네트워크 요청 없음)
                <div className="w-full h-full bg-gradient-to-br from-pink-100 via-purple-100 to-pink-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📰</div>
                    <div className="text-sm text-gray-600 font-medium">나는솔로 뉴스</div>
                  </div>
                </div>
              )}
        {/* 이미지 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      <div className="relative p-6">
        {/* 제목 - 이미지 아래에 배치하고 가독성 개선 */}
        <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-3 mb-3 border border-gray-100">
          <h3 className="text-xl font-bold line-clamp-2 group-hover:text-pink-600 transition-colors duration-200 leading-tight text-gray-900 drop-shadow-sm">
            {article.title}
          </h3>
        </div>

        {/* 요약 */}
        {article.summary && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
            {truncateText(article.summary, 150)}
          </p>
        )}

        {/* 출연자 태그 */}
        {article.cast_members && article.cast_members.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {article.cast_members.slice(0, 3).map((member, index) => (
              <span
                key={index}
                className="inline-block bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800 text-xs px-3 py-1.5 rounded-full font-medium border border-pink-200/50"
              >
                {member}
              </span>
            ))}
            {article.cast_members.length > 3 && (
              <span className="inline-block bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full font-medium">
                +{article.cast_members.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 키워드 태그 */}
        {article.keywords && article.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {article.keywords.slice(0, 2).map((keyword, index) => (
              <span
                key={index}
                className="inline-block bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 text-xs px-3 py-1.5 rounded-full font-medium border border-blue-200/50"
              >
                #{keyword}
              </span>
            ))}
          </div>
        )}

        {/* 메타 정보 */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100/50">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg px-3 py-1.5">
              <span className="text-xs font-semibold text-pink-700">
                {article.source || extractDomain(article.article_url)}
              </span>
            </div>
            {article.cluster_id && (
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs font-medium">
                클러스터
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500 font-medium">
              {article.published_at 
                ? formatDistanceToNow(article.published_at)
                : '날짜 미상'
              }
            </div>
            <button
              onClick={handleBookmark}
              className={`p-1.5 rounded-full transition-all duration-200 ${
                isFavorite(article.id)
                  ? 'bg-pink-600 text-white hover:bg-pink-700'
                  : 'bg-white/60 text-gray-700 hover:bg-white'
              }`}
              aria-label={`${isFavorite(article.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}`}
            >
              <BookmarkPlus className={`h-4 w-4 ${isFavorite(article.id) ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* 상단 호버 액션 제거 (읽기/북마크 버튼 숨김) */}
      </div>
    </div>
  );
}
