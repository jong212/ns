"use client";

import { useState, useEffect } from "react";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const savedFavorites = localStorage.getItem("favoriteCastMembers");
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  const toggleFavorite = (castMember: string) => {
    const newFavorites = favorites.includes(castMember)
      ? favorites.filter((f) => f !== castMember)
      : [...favorites, castMember];
    
    setFavorites(newFavorites);
    localStorage.setItem("favoriteCastMembers", JSON.stringify(newFavorites));
  };

  const isFavorite = (castMember: string) => favorites.includes(castMember);

  return { favorites, toggleFavorite, isFavorite };
}
