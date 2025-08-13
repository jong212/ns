"use client";

import { useEffect, useState } from "react";
import { NewsArticle } from "@/lib/types";

// 브라우저 로컬스토리지 기반의 기사 즐겨찾기 관리 훅
// 최소 필드만 저장하여 공간 효율성 확보
export interface FavoriteArticle {
  id: string;
  title: string;
  article_url: string;
  source?: string;
  thumbnail_url?: string;
  published_at?: string;
}

const STORAGE_KEY = "favoriteArticles";

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteArticle[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FavoriteArticle[];
        setFavorites(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setFavorites([]);
    }
  }, []);

  const persist = (items: FavoriteArticle[]) => {
    setFavorites(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  const isFavorite = (articleId: string) =>
    favorites.some((f) => f.id === articleId);

  const toFavorite = (article: NewsArticle): FavoriteArticle => ({
    id: article.id,
    title: article.title,
    article_url: article.article_url,
    source: article.source,
    thumbnail_url: article.thumbnail_url,
    published_at: article.published_at,
  });

  const toggleFavorite = (article: NewsArticle | FavoriteArticle) => {
    const articleId = (article as FavoriteArticle).id || (article as NewsArticle).id;
    const exists = favorites.some((f) => f.id === articleId);
    if (exists) {
      const next = favorites.filter((f) => f.id !== articleId);
      persist(next);
    } else {
      const fav = toFavorite(article as NewsArticle);
      persist([...favorites, fav]);
    }
  };

  return { favorites, isFavorite, toggleFavorite };
}
