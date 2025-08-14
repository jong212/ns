import { createClient } from '@supabase/supabase-js';

// 환경 변수 우선 사용 (없으면 기존 값으로 폴백)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jlccchxxhkahmnuapmlj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2NjaHh4aGthaG1udWFwbWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjExOTIsImV4cCI6MjA3MDM5NzE5Mn0.zbxoXEmlQ3pXVIbfgi9DEF1GJjMSiBG9qbXQ4xdZhVU';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  // 개발 편의를 위한 경고 로그
  // 실제 배포 시에는 반드시 환경 변수로 주입하세요.
  console.warn('[supabase] 환경 변수(NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)가 설정되지 않아 기본 키를 사용합니다.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
