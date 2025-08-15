-- 테이블명에 solo_ 접두사 추가 마이그레이션
-- 기존 테이블을 새 이름으로 변경하고 데이터 마이그레이션

-- 1. articles 테이블 마이그레이션
CREATE TABLE IF NOT EXISTS solo_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  article_url TEXT UNIQUE NOT NULL,
  canonical_url TEXT,
  source TEXT,
  summary TEXT,
  thumbnail_url TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  raw_meta JSONB,
  hash TEXT NOT NULL,
  
  -- 나는솔로 전용 컬럼
  cluster_id TEXT,
  keywords TEXT[],
  cast_members TEXT[]
);

-- 기존 데이터 복사
INSERT INTO solo_articles 
SELECT * FROM articles 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'articles');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_solo_articles_published_at ON solo_articles(published_at);
CREATE INDEX IF NOT EXISTS idx_solo_articles_cluster_id ON solo_articles(cluster_id);
CREATE INDEX IF NOT EXISTS idx_solo_articles_source ON solo_articles(source);
CREATE INDEX IF NOT EXISTS idx_solo_articles_status ON solo_articles(status);
CREATE INDEX IF NOT EXISTS idx_solo_articles_keywords ON solo_articles USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_solo_articles_cast_members ON solo_articles USING GIN(cast_members);

-- 2. posts 테이블 마이그레이션
CREATE TABLE IF NOT EXISTS solo_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) >= 2),
  content TEXT NOT NULL CHECK (char_length(content) >= 5),
  nickname TEXT NOT NULL DEFAULT '익명',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 기존 데이터 복사
INSERT INTO solo_posts 
SELECT * FROM posts 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts');

CREATE INDEX IF NOT EXISTS idx_solo_posts_created_at ON solo_posts(created_at DESC);

-- 3. comments 테이블 마이그레이션
CREATE TABLE IF NOT EXISTS solo_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES solo_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1),
  nickname TEXT NOT NULL DEFAULT '익명',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 기존 데이터 복사 (post_id 참조 업데이트 필요)
INSERT INTO solo_comments (id, post_id, content, nickname, created_at)
SELECT 
  c.id,
  p.id as new_post_id,
  c.content,
  c.nickname,
  c.created_at
FROM comments c
JOIN solo_posts p ON p.id = c.post_id
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments');

CREATE INDEX IF NOT EXISTS idx_solo_comments_post_id_created_at ON solo_comments(post_id, created_at DESC);

-- 4. function_logs 테이블 마이그레이션
CREATE TABLE IF NOT EXISTS solo_function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  execution_time FLOAT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 데이터 복사
INSERT INTO solo_function_logs 
SELECT * FROM function_logs 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'function_logs');

CREATE INDEX IF NOT EXISTS idx_solo_function_logs_function_name ON solo_function_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_solo_function_logs_status ON solo_function_logs(status);
CREATE INDEX IF NOT EXISTS idx_solo_function_logs_created_at ON solo_function_logs(created_at);

-- 5. chat_messages 테이블 마이그레이션 (존재하는 경우)
CREATE TABLE IF NOT EXISTS solo_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 데이터 복사
INSERT INTO solo_chat_messages 
SELECT * FROM chat_messages 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages');

-- RLS 정책 설정
ALTER TABLE solo_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE solo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE solo_function_logs ENABLE ROW LEVEL SECURITY;

-- 읽기: 모두
CREATE POLICY IF NOT EXISTS solo_posts_read_all ON solo_posts FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS solo_comments_read_all ON solo_comments FOR SELECT USING (true);

-- 쓰기: 모두 (익명 허용)
CREATE POLICY IF NOT EXISTS solo_posts_insert_all ON solo_posts FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS solo_comments_insert_all ON solo_comments FOR INSERT WITH CHECK (true);

-- function_logs 정책
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read solo function logs" ON solo_function_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow service role to insert solo function logs" ON solo_function_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 업데이트 트리거: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION set_solo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_solo_posts_set_updated_at ON solo_posts;
CREATE TRIGGER trg_solo_posts_set_updated_at
BEFORE UPDATE ON solo_posts
FOR EACH ROW EXECUTE FUNCTION set_solo_updated_at();

-- 30일 후 자동 삭제를 위한 함수 생성
CREATE OR REPLACE FUNCTION cleanup_old_solo_function_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM solo_function_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
