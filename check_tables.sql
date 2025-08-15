-- 현재 테이블 상태 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('articles', 'posts', 'comments', 'function_logs', 'chat_messages')
ORDER BY table_name;

-- 각 테이블의 레코드 수 확인
SELECT 
  'articles' as table_name,
  COUNT(*) as record_count
FROM articles
UNION ALL
SELECT 
  'posts' as table_name,
  COUNT(*) as record_count
FROM posts
UNION ALL
SELECT 
  'comments' as table_name,
  COUNT(*) as record_count
FROM comments
UNION ALL
SELECT 
  'function_logs' as table_name,
  COUNT(*) as record_count
FROM function_logs
UNION ALL
SELECT 
  'chat_messages' as table_name,
  COUNT(*) as record_count
FROM chat_messages;
