'use client';

import { NewsCard } from '@/components/ui/NewsCard';
import { useNews } from '@/hooks/useNews';
import { useMemo, useState } from 'react';
import { CAST_CATEGORIES, matchesCast } from '@/lib/cast';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FavoritesButton } from '@/components/FavoritesButton';
import { ChatWidget } from '@/components/ChatWidget';
import { SiteBookmarkButton } from '@/components/SiteBookmarkButton';

export default function Home() {
  const { articles, loading, error, total, hasMore, refetch, loadMore } = useNews();
  const [selectedCast, setSelectedCast] = useState<string>('');

  // 고정 카테고리 + 데이터 기반 추천(상위 최대 10개)
  const dynamicCasts = useMemo(() => {
    const freq = new Map<string, number>();
    for (const a of articles) {
      (a.cast_members || []).forEach((m) => freq.set(m, (freq.get(m) || 0) + 1));
      const hay = [a.title || '', a.summary || '', (a.keywords || []).join(' ')].join(' ');
      CAST_CATEGORIES.forEach((name) => {
        if (hay.includes(name)) freq.set(name, (freq.get(name) || 0) + 1);
      });
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .filter((n) => !CAST_CATEGORIES.includes(n))
      .slice(0, 10);
  }, [articles]);

  const allCastMembers = useMemo(
    () => Array.from(new Set([ ...CAST_CATEGORIES, ...dynamicCasts ])),
    [dynamicCasts]
  );

  const handleCastFilter = (cast: string) => {
    setSelectedCast(cast === selectedCast ? '' : cast);
  };

  if (loading && articles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-200 border-t-pink-600 mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg font-medium">뉴스를 불러오는 중...</p>
          <p className="text-gray-400 text-sm mt-2">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={refetch}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* 헤더 */}
      <header className="relative overflow-hidden">
        {/* 배경 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-600"></div>
        
        {/* 장식 요소 */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute top-20 right-20 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          <div className="absolute bottom-10 left-1/4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            {/* 다크모드 토글 버튼과 즐겨찾기 버튼 */}
            <div className="absolute top-4 right-4 flex space-x-2">
              <SiteBookmarkButton />
              <FavoritesButton />
              <ThemeToggle />
            </div>
            
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6 backdrop-blur-sm">
              <span className="text-3xl">💕</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
              나는솔로 뉴스 허브
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
              나는솔로 관련 최신 뉴스를 한눈에 확인하세요
            </p>
            <div className="mt-6">
              <Link
                href="/guide"
                className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/30 transition-all duration-200 border border-white/30"
              >
                📖 나는솔로 가이드 보기
              </Link>
            </div>
            <div className="mt-6 flex justify-center space-x-4 text-white/80">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                <span className="text-sm">실시간 업데이트</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                <span className="text-sm">출연자별 필터</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 필터 섹션 */}
      <div className="bg-app-surface backdrop-blur-sm border-b border-app shadow-app">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-700 flex items-center">
              <span className="w-2 h-2 bg-pink-500 rounded-full mr-2"></span>
              출연자별 필터:
            </span>
            <button
              onClick={() => setSelectedCast('')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCast === ''
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                  : 'bg-white/70 text-gray-700 hover:bg-white hover:shadow-md border border-gray-200'
              }`}
            >
              전체
            </button>
            {allCastMembers.map((cast) => (
              <button
                key={cast}
                onClick={() => handleCastFilter(cast)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCast === cast
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                    : 'bg-white/70 text-gray-700 hover:bg-white hover:shadow-md border border-gray-200'
                }`}
              >
                {cast}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 상태 표시 */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
              <div className="bg-app-card backdrop-blur-sm rounded-xl px-4 py-2 shadow-app border border-app">
              <span className="text-sm text-gray-600">
                총 <span className="font-bold text-pink-600">{total}</span>개의 뉴스
              </span>
            </div>
            {selectedCast && (
              <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-xl px-4 py-2 border border-pink-200">
                <span className="text-sm text-pink-700 font-medium">
                  {selectedCast} 관련
                </span>
              </div>
            )}
          </div>
          <button
            onClick={refetch}
            className="bg-app-card backdrop-blur-sm rounded-xl px-4 py-2 shadow-app border border-app hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
          >
            <span className="text-gray-600">🔄</span>
            <span className="text-sm text-gray-700 font-medium">새로고침</span>
          </button>
        </div>

        {/* 뉴스 그리드 */}
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles
              .filter(article => !selectedCast || matchesCast(article, selectedCast))
              .map((article) => (
                <NewsCard
                  key={article.id}
                  article={article}
                />
              ))
            }
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-app-card backdrop-blur-sm rounded-2xl p-12 shadow-app border border-app max-w-md mx-auto">
              <div className="text-gray-400 text-6xl mb-6">📰</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                뉴스가 없습니다
              </h3>
              <p className="text-gray-600 leading-relaxed">
                아직 수집된 뉴스가 없거나 필터 조건에 맞는 뉴스가 없습니다.
              </p>
            </div>
          </div>
        )}

        {/* 더 보기 버튼 */}
        {hasMore && (
          <div className="text-center mt-12">
            <button
              onClick={loadMore}
              disabled={loading}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-medium"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>로딩 중...</span>
                </div>
              ) : (
                '더 보기'
              )}
            </button>
          </div>
        )}
      </main>

      {/* 채팅 위젯 */}
      <ChatWidget />
    </div>
  );
}
