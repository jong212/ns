"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";

export function FavoritesButton() {
  const { favorites } = useFavorites();

  return (
    <button
      className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200 text-white relative"
      aria-label="즐겨찾기"
    >
      <Heart className="h-5 w-5" />
      {favorites.length > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {favorites.length}
        </span>
      )}
    </button>
  );
}
