"use client";

import { BookmarkPlus } from "lucide-react";
import { useCallback } from "react";

export function SiteBookmarkButton() {
  const handleClick = useCallback(async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const shortcut = isMac ? "Cmd + D" : "Ctrl + D";
      alert(`사이트를 북마크에 추가하려면 ${shortcut} 를 눌러주세요.\n현재 페이지 URL이 복사되었습니다.`);
    } catch {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const shortcut = isMac ? "Cmd + D" : "Ctrl + D";
      alert(`사이트를 북마크에 추가하려면 ${shortcut} 를 눌러주세요.`);
    }
  }, []);

  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200 text-white"
      aria-label="사이트 북마크"
    >
      <BookmarkPlus className="h-5 w-5" />
    </button>
  );
}


