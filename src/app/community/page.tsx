'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';

interface Post {
  id: string;
  title: string;
  content: string;
  nickname: string;
  created_at: string;
}

export default function CommunityListPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/community/posts?limit=20&offset=0');
        const json = await res.json();
        if (json.success) setPosts(json.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-app">커뮤니티</h1>
        <button
          className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700"
          onClick={() => {
            if (authLoading) return;
            if (!user) {
              router.push('/auth?redirect=%2Fcommunity%2Fnew');
            } else {
              router.push('/community/new');
            }
          }}
        >
          글쓰기
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500">불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="text-gray-500">아직 게시글이 없습니다.</div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="p-4 rounded-lg bg-app-card border border-app shadow-app hover:shadow-md transition">
              <Link href={`/community/${p.id}`} className="block">
                <div className="font-semibold text-app">{p.title}</div>
                <div className="text-sm text-gray-500 mt-1">by {p.nickname} • {new Date(p.created_at).toLocaleString()}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


