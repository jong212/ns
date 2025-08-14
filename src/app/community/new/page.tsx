'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CommunityNewPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  // 클라이언트에서만 닉네임 초기화
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('nickname') || '';
        if (saved) setNickname(saved);
      }
    } catch {}
  }, []);

  const submit = async () => {
    if (title.trim().length < 2 || content.trim().length < 5) return alert('제목/내용이 너무 짧습니다');
    setLoading(true);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="내용" className="w-full border rounded-lg p-3 h-56" />
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임(선택)" className="w-full border rounded-lg p-3" />
        <div className="flex gap-2">
          <button onClick={submit} disabled={loading} className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50">{loading ? '저장 중...' : '등록'}</button>
          <button onClick={() => router.back()} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">취소</button>
        </div>
      </div>
    </div>
  );
}


