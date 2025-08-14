-- 커뮤니티 게시판 기본 테이블 생성

-- 확장 확인 (uuid 생성용)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- posts 테이블
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) >= 2),
  content TEXT NOT NULL CHECK (char_length(content) >= 5),
  nickname TEXT NOT NULL DEFAULT '익명',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- comments 테이블
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1),
  nickname TEXT NOT NULL DEFAULT '익명',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id_created_at ON public.comments(post_id, created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 읽기: 모두
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'posts_read_all'
  ) THEN
    CREATE POLICY posts_read_all ON public.posts FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'comments_read_all'
  ) THEN
    CREATE POLICY comments_read_all ON public.comments FOR SELECT USING (true);
  END IF;
END $$;

-- 쓰기: 모두 (익명 허용)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'posts_insert_all'
  ) THEN
    CREATE POLICY posts_insert_all ON public.posts FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'comments_insert_all'
  ) THEN
    CREATE POLICY comments_insert_all ON public.comments FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 업데이트 트리거: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_set_updated_at ON public.posts;
CREATE TRIGGER trg_posts_set_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


