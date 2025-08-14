export function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (envUrl) {
    return envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
  }
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV;
  if (env === 'production') {
    return 'https://pazamang.com';
  }
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }
  return 'http://localhost:3000';
}


