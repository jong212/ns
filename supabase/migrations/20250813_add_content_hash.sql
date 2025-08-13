-- content_hash 컬럼 추가 (제목+요약 기반 중복 판정용)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- content_hash에 인덱스 추가 (중복 검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_articles_content_hash ON articles(content_hash);

-- 기존 embedding 컬럼 제거 (허깅페이스 의존성 제거)
ALTER TABLE articles DROP COLUMN IF EXISTS embedding;

-- content_hash가 NULL이 아닌 기존 기사들에 대해 content_hash 생성
-- (선택사항: 기존 데이터 마이그레이션)
-- UPDATE articles 
-- SET content_hash = encode(sha256((title || E'\n' || COALESCE(summary, '')).encode('utf-8')), 'hex')
-- WHERE content_hash IS NULL;
