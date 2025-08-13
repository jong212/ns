-- Enable pgvector and add embedding column for articles
CREATE EXTENSION IF NOT EXISTS vector;

-- 384차원(Hugging Face MiniLM)으로 변경
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'articles' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE public.articles ADD COLUMN embedding vector(384);
  ELSE
    BEGIN
      EXECUTE 'ALTER TABLE public.articles ALTER COLUMN embedding TYPE vector(384)';
    EXCEPTION WHEN others THEN
      -- 기존에 1536차원 데이터가 있으면 타입 변경이 실패할 수 있음. 안전하게 드롭 후 재생성 옵션.
      RAISE NOTICE 'Recreating embedding column as vector(384)';
      ALTER TABLE public.articles DROP COLUMN IF EXISTS embedding;
      ALTER TABLE public.articles ADD COLUMN embedding vector(384);
    END;
  END IF;
END$$;

-- 인덱스 재생성
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_articles_embedding' AND n.nspname = 'public'
  ) THEN
    DROP INDEX public.idx_articles_embedding;
  END IF;
  CREATE INDEX idx_articles_embedding
    ON public.articles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
END$$;
