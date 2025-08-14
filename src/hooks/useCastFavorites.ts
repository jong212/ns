"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "favoriteCastMembers";

export function useCastFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as unknown;
        if (Array.isArray(parsed)) {
          setFavorites(parsed.filter((v) => typeof v === "string"));
        } else {
          setFavorites([]);
        }
      }
    } catch {
      setFavorites([]);
    }
  }, []);

  const persist = (items: string[]) => {
    setFavorites(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  const isFavorite = (name: string) => favorites.includes(name);

  const toggleFavorite = (name: string) => {
    if (!name) return;
    if (favorites.includes(name)) {
      persist(favorites.filter((n) => n !== name));
    } else {
      persist([...favorites, name]);
    }
  };

  return { favorites, isFavorite, toggleFavorite };
}


