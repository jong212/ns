import { createClient } from '@supabase/supabase-js';

// 올바른 Supabase 키 사용
const supabaseUrl = 'https://jlccchxxhkahmnuapmlj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2NjaHh4aGthaG1udWFwbWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjExOTIsImV4cCI6MjA3MDM5NzE5Mn0.zbxoXEmlQ3pXVIbfgi9DEF1GJjMSiBG9qbXQ4xdZhVU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
