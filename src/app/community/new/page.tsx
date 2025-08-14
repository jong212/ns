'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';

export default function CommunityNewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const RichEditor = useMemo(() => dynamic(() => import('@/components/RichEditor'), { ssr: false }), []);

  // 클라이언트에서만 닉네임 초기화
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('nickname') || '';
        if (saved) setNickname(saved);
      }
    } catch {}
  }, []);

  // 로그인 가드: 미로그인 시 로그인 페이지로 이동
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/auth?redirect=${encodeURIComponent('/community/new')}`);
    }
  }, [authLoading, user, router]);

  const submit = async () => {
    if (title.trim().length < 2 || content.trim().length < 5) return alert('제목/내용이 너무 짧습니다');
    setLoading(true);
    try {
      // 세션 토큰을 포함하여 서버에서 인증 검증 가능하도록 처리
      let accessToken: string | undefined;
      try {
        const { data } = await (await import('@/lib/supabase')).supabase.auth.getSession();
        accessToken = data.session?.access_token;
      } catch {}
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ title, content, nickname: nickname || '익명' })
      });
      const json = await res.json();
      if (json.success) {
        if (nickname) localStorage.setItem('nickname', nickname);
        router.push(`/community/${json.data.id}`);
      } else {
        alert('작성 실패');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">글쓰기</h1>
      <div className="space-y-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" className="w-full border rounded-lg p-3" />
        {/* 리치 텍스트 에디터 */}
        <RichEditor value={content} onChange={setContent} placeholder="내용을 입력하세요" />
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임(선택)" className="w-full border rounded-lg p-3" />
        <div className="flex gap-2">
          <button onClick={submit} disabled={loading} className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50">{loading ? '저장 중...' : '등록'}</button>
          <button onClick={() => router.back()} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">취소</button>
        </div>
      </div>
    </div>
  );
}


