'use client';

import { NewsCard } from '@/components/ui/NewsCard';
import { useNews } from '@/hooks/useNews';
import { useState } from 'react';

export default function Home() {
  const { articles, loading, error, total, hasMore, refetch, loadMore } = useNews();
  const [selectedCast, setSelectedCast] = useState<string>('');

  // 출연자 목록 추출 (중복 제거)
  const allCastMembers = Array.from(
    new Set(
      articles
        .flatMap(article => article.cast_members || [])
        .filter(Boolean)
    )
  ).slice(0, 10); // 상위 10명만 표시

  const handleCastFilter = (cast: string) => {
    setSelectedCast(cast === selectedCast ? '' : cast);
  };

  if (loading && articles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">뉴스를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️ 오류가 발생했습니다</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              💕 나는솔로 뉴스 허브
            </h1>
            <p className="text-gray-600">
              나는솔로 관련 최신 뉴스를 한눈에 확인하세요
            </p>
          </div>
        </div>
      </header>

      {/* 필터 섹션 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 flex items-center mr-2">
              출연자별 필터:
            </span>
            <button
              onClick={() => setSelectedCast('')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedCast === ''
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            {allCastMembers.map((cast) => (
              <button
                key={cast}
                onClick={() => handleCastFilter(cast)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedCast === cast
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cast}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 상태 표시 */}
        <div className="mb-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            총 <span className="font-semibold text-pink-600">{total}</span>개의 뉴스
            {selectedCast && (
              <span className="ml-2">
                ({selectedCast} 관련)
              </span>
            )}
          </div>
          <button
            onClick={refetch}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            🔄 새로고침
          </button>
        </div>

        {/* 뉴스 그리드 */}
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles
              .filter(article => 
                !selectedCast || 
                (article.cast_members && article.cast_members.includes(selectedCast))
              )
              .map((article) => (
                <NewsCard
                  key={article.id}
                  article={article}
                />
              ))
            }
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📰</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              뉴스가 없습니다
            </h3>
            <p className="text-gray-600">
              아직 수집된 뉴스가 없거나 필터 조건에 맞는 뉴스가 없습니다.
            </p>
          </div>
        )}

        {/* 더 보기 버튼 */}
        {hasMore && (
          <div className="text-center mt-8">
            <button
              onClick={loadMore}
              disabled={loading}
              className="bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로딩 중...' : '더 보기'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
