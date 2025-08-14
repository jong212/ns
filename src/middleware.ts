import { NextResponse } from 'next/server';

export function middleware(request: Request) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();

  // 프로덕션에서만 강제 정규화
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV;
  const isProd = env === 'production';

  if (isProd) {
    const targetHost = 'pazamang.com';
    // www.* 또는 *.vercel.app 등을 pazamang.com 으로 308 리다이렉트
    if (host !== targetHost) {
      url.hostname = targetHost;
      return NextResponse.redirect(url.toString(), 308);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};


