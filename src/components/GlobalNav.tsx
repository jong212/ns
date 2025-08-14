'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function linkClass(active: boolean) {
  if (active) return 'text-pink-600 dark:text-pink-400 font-semibold';
  return 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white';
}

export function GlobalNav() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isGuide = pathname.startsWith('/guide');
  const isCommunity = pathname.startsWith('/community');

  return (
    <nav className="flex items-center gap-5 text-sm font-medium">
      <Link href="/" className={linkClass(isHome)}>홈</Link>
      <Link href="/guide" className={linkClass(isGuide)}>가이드</Link>
      <Link href="/community" className={linkClass(isCommunity)}>커뮤니티</Link>
    </nav>
  );
}


