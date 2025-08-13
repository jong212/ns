import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "나는솔로 뉴스 허브 - 나는솔로 최신 뉴스, 출연자 소식, 시청률 정보",
  description: "나는솔로 관련 최신 뉴스, 출연자 소식, 시청률, 커플 성사 현황을 실시간으로 확인하세요. 정숙, 영수, 영자 등 출연자별 필터링으로 원하는 정보를 빠르게 찾아보세요.",
  keywords: "나는솔로, 나솔, 정숙, 영수, 영자, 시청률, 커플, 데이트, 연애, 엔터테인먼트, 예능",
  authors: [{ name: "나는솔로 뉴스 허브" }],
  creator: "나는솔로 뉴스 허브",
  publisher: "나는솔로 뉴스 허브",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://nasole-news.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "나는솔로 뉴스 허브 - 나는솔로 최신 뉴스, 출연자 소식",
    description: "나는솔로 관련 최신 뉴스, 출연자 소식, 시청률, 커플 성사 현황을 실시간으로 확인하세요.",
    url: 'https://nasole-news.vercel.app',
    siteName: '나는솔로 뉴스 허브',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '나는솔로 뉴스 허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "나는솔로 뉴스 허브 - 나는솔로 최신 뉴스, 출연자 소식",
    description: "나는솔로 관련 최신 뉴스, 출연자 소식, 시청률, 커플 성사 현황을 실시간으로 확인하세요.",
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Google AdSense */}
        <meta name="google-adsense-account" content="ca-pub-4954015900834632" />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4954015900834632"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
