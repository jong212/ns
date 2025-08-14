'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const submit = async () => {
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
      router.replace('/auth');
    } catch (e) {
      const message = e instanceof Error ? e.message : '비밀번호 변경 실패';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-app-card border border-app shadow-app rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-app mb-4">비밀번호 변경</h1>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="새 비밀번호"
          className="w-full border rounded-lg p-3 mb-3"
        />
        <button onClick={submit} disabled={loading} className="w-full px-4 py-3 rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50">
          {loading ? '저장 중…' : '비밀번호 변경'}
        </button>
      </div>
    </div>
  );
}


