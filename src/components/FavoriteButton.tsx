"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";

interface FavoriteButtonProps {
  castMember: string;
  className?: string;
}

export function FavoriteButton({ castMember, className = "" }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();

  return (
    <button
      onClick={() => toggleFavorite(castMember)}
      className={`p-1.5 rounded-full transition-all duration-200 ${
        isFavorite(castMember)
          ? "bg-red-500 text-white hover:bg-red-600"
          : "bg-white/20 text-gray-600 hover:bg-white/30"
      } ${className}`}
      aria-label={`${castMember} ${isFavorite(castMember) ? "즐겨찾기 해제" : "즐겨찾기 추가"}`}
    >
      <Heart
        className={`h-4 w-4 ${
          isFavorite(castMember) ? "fill-current" : ""
        }`}
      />
    </button>
  );
}
