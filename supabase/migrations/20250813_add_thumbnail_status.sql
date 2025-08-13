-- Track thumbnail processing results so failures are not retried
ALTER TABLE articles
	ADD COLUMN IF NOT EXISTS thumbnail_status TEXT; -- null|success|failed

CREATE INDEX IF NOT EXISTS idx_articles_thumbnail_status ON articles(thumbnail_status);
