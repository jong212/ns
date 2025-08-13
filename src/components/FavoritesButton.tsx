"use client";

import { useState } from "react";
import { Bookmark, ExternalLink, Heart, X } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";

export function FavoritesButton() {
  const { favorites, toggleFavorite } = useFavorites();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200 text-white relative"
        aria-label="즐겨찾기"
      >
        <Bookmark className="h-5 w-5" />
        {favorites.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {favorites.length}
          </span>
        )}
      </button>

      {/* 즐겨찾기 목록 팝업 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-80 max-h-96 overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-pink-500 to-purple-600 text-white">
              <h3 className="font-semibold">🔖 즐겨찾기 기사</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 즐겨찾기 목록 */}
            <div className="p-4 max-h-64 overflow-y-auto">
              {favorites.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <div className="text-2xl mb-2">💔</div>
                  <p>즐겨찾기한 기사가 없습니다</p>
                  <p className="text-sm mt-2">뉴스 카드에서 북마크 아이콘을 눌러보세요!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {favorites.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="min-w-0 mr-2">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {item.source || new URL(item.article_url).hostname}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={item.article_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                          aria-label="기사 열기"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => toggleFavorite(item)}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                          aria-label={`즐겨찾기 해제`}
                        >
                          <Heart className="h-4 w-4 fill-current" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
