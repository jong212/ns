-- Function logs 테이블 생성
CREATE TABLE IF NOT EXISTS function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  execution_time FLOAT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_function_logs_function_name ON function_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_function_logs_status ON function_logs(status);
CREATE INDEX IF NOT EXISTS idx_function_logs_created_at ON function_logs(created_at);

-- RLS 정책 설정 (읽기 전용)
ALTER TABLE function_logs ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자만 읽기 가능
CREATE POLICY "Allow authenticated users to read function logs" ON function_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- 서비스 롤만 쓰기 가능
CREATE POLICY "Allow service role to insert function logs" ON function_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 30일 후 자동 삭제를 위한 함수 생성
CREATE OR REPLACE FUNCTION cleanup_old_function_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM function_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 매일 자정에 실행되는 스케줄 생성 (선택사항)
-- SELECT cron.schedule('cleanup-function-logs', '0 0 * * *', 'SELECT cleanup_old_function_logs();');
