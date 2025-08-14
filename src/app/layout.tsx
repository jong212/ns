import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalNav } from "@/components/GlobalNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";
import { getBaseUrl } from "@/lib/site";
import { FavoritesProvider } from "@/hooks/useFavorites";

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
  metadataBase: new URL(getBaseUrl()),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "나는솔로 뉴스 허브 - 나는솔로 최신 뉴스, 출연자 소식",
    description: "나는솔로 관련 최신 뉴스, 출연자 소식, 시청률, 커플 성사 현황을 실시간으로 확인하세요.",
    url: getBaseUrl(),
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
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Google AdSense */}
        <meta name="google-adsense-account" content="ca-pub-4954015900834632" />
        <meta name="naver-site-verification" content="beb1bfa7e429d003185d88881291a957fb813981" />
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
					{/* Global Navigation */}
					<header className="sticky top-0 z-50 border-b bg-white/70 dark:bg-gray-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
						<div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <GlobalNav />

							<div className="flex items-center gap-2">
								<ThemeToggle />
							</div>
						</div>
					</header>

					<FavoritesProvider>
						{children}
					</FavoritesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
