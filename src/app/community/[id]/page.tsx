'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Comment {
  id: string;
  post_id: string;
  content: string;
  nickname: string;
  created_at: string;
}

interface PostDetail {
  post: {
    id: string;
    title: string;
    content: string;
    nickname: string;
    created_at: string;
  };
  comments: Comment[];
}

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<PostDetail | null>(null);
  const [content, setContent] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(true);
  const id = params.id;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/community/posts/${id}`);
        const json = await res.json();
        if (json.success) setDetail(json.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // 클라이언트에서만 닉네임 초기화
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('nickname') || '';
        if (saved) setNickname(saved);
      }
    } catch {}
  }, []);

  const submitComment = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const res = await fetch('/api/community/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: id, content: trimmed, nickname: nickname || '익명' })
    });
    const json = await res.json();
    if (json.success) {
      if (nickname) localStorage.setItem('nickname', nickname);
      setContent('');
      // 낙관적 갱신
      setDetail((prev) => prev ? { ...prev, comments: [json.data, ...prev.comments] } : prev);
    }
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-10 text-gray-500">불러오는 중...</div>;
  if (!detail) return <div className="max-w-3xl mx-auto px-4 py-10 text-gray-500">존재하지 않는 글입니다.</div>;

  const { post, comments } = detail;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div className="p-6 rounded-lg bg-app-card shadow-app border border-app">
        <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
        <div className="text-sm text-gray-500 mt-1">by {post.nickname} • {new Date(post.created_at).toLocaleString()}</div>
        <div className="mt-4 whitespace-pre-wrap text-gray-800 leading-relaxed">{post.content}</div>
      </div>

      <div className="p-6 rounded-lg bg-app-card shadow-app border border-app">
        <h2 className="text-lg font-semibold mb-3">댓글</h2>
        <div className="flex flex-col gap-2 mb-4">
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="댓글" className="w-full border rounded-lg p-3" />
          <div className="flex gap-2">
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임(선택)" className="border rounded-lg p-2" />
            <button onClick={submitComment} className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700">등록</button>
            <button onClick={() => router.push('/community')} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">목록</button>
          </div>
        </div>
        <ul className="space-y-3">
          {comments.length === 0 ? (
            <li className="text-gray-500">첫 댓글을 남겨보세요.</li>
          ) : (
            comments.map((c) => (
              <li key={c.id} className="p-4 rounded-lg bg-gray-50 border">
                <div className="text-sm text-gray-600 mb-1">{c.nickname} • {new Date(c.created_at).toLocaleString()}</div>
                <div className="whitespace-pre-wrap text-gray-800">{c.content}</div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}


