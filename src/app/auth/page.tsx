
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get('redirect') || '/';
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
      }
      router.replace(redirectTo);
    } catch (e) {
      const message = e instanceof Error ? e.message : '인증 중 오류가 발생했습니다';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-app-card border border-app shadow-app rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-app mb-1">{mode === 'signin' ? '로그인' : '회원가입'}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {mode === 'signin' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
          <button
            className="text-pink-600 hover:text-pink-700"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin' ? '회원가입' : '로그인'}으로 전환
          </button>
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            autoComplete="email"
            className="w-full border rounded-lg p-3"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className="w-full border rounded-lg p-3"
          />
          {mode === 'signin' && (
            <button
              type="button"
              className="text-xs text-blue-600 hover:text-blue-700"
              onClick={async () => {
                if (!email) {
                  setError('비밀번호 재설정을 위해 이메일을 먼저 입력해주세요');
                  return;
                }
                setLoading(true);
                setError(null);
                try {
                  const origin = typeof window !== 'undefined' ? window.location.origin : '';
                  const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${origin}/auth/update-password`,
                  });
                  if (err) throw err;
                  alert('재설정 메일을 보냈습니다. 메일함을 확인하세요.');
                } catch (e) {
                  const message = e instanceof Error ? e.message : '재설정 메일 전송 실패';
                  setError(message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              비밀번호 재설정 메일 보내기
            </button>
          )}
          <button
            onClick={submit}
            disabled={loading}
            className="w-full px-4 py-3 rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50"
          >
            {loading ? '처리 중…' : mode === 'signin' ? '로그인' : '회원가입'}
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-gray-400">
          <Link href="/" className="hover:underline">홈으로</Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center">불러오는 중…</div>}>
      <AuthForm />
    </Suspense>
  );
}

