"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { NewsArticle } from "@/lib/types";

// 브라우저 로컬스토리지 기반의 기사 즐겨찾기 전역 상태
export interface FavoriteArticle {
  id: string;
  title: string;
  article_url: string;
  source?: string;
  thumbnail_url?: string;
  published_at?: string;
}

interface FavoritesContextValue {
  favorites: FavoriteArticle[];
  isFavorite: (articleId: string) => boolean;
  toggleFavorite: (article: NewsArticle | FavoriteArticle) => void;
}

const STORAGE_KEY = "favoriteArticles";
const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function toFavorite(article: NewsArticle): FavoriteArticle {
  return {
    id: article.id,
    title: article.title,
    article_url: article.article_url,
    source: article.source,
    thumbnail_url: article.thumbnail_url,
    published_at: article.published_at,
  };
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteArticle[]>([]);

  // 초기 로드
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

  // 다른 탭/창 동기화
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          const parsed = e.newValue ? (JSON.parse(e.newValue) as FavoriteArticle[]) : [];
          setFavorites(Array.isArray(parsed) ? parsed : []);
        } catch {
          setFavorites([]);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((items: FavoriteArticle[]) => {
    setFavorites(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, []);

  const isFavorite = useCallback(
    (articleId: string) => favorites.some((f) => f.id === articleId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (article: NewsArticle | FavoriteArticle) => {
      const articleId = (article as FavoriteArticle).id || (article as NewsArticle).id;
      const exists = favorites.some((f) => f.id === articleId);
      if (exists) {
        const next = favorites.filter((f) => f.id !== articleId);
        persist(next);
      } else {
        const fav = toFavorite(article as NewsArticle);
        persist([...favorites, fav]);
      }
    },
    [favorites, persist]
  );

  const value = useMemo<FavoritesContextValue>(() => ({ favorites, isFavorite, toggleFavorite }), [favorites, isFavorite, toggleFavorite]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}


