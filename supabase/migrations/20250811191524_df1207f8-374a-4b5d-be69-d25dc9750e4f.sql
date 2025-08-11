-- Add source_type column to mentions and helpful indexes for performance and dedupe
ALTER TABLE public.mentions
ADD COLUMN IF NOT EXISTS source_type text;

-- Dedupe by user + source_url
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mentions_user_source_url
ON public.mentions (user_id, source_url);

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_mentions_user_published
ON public.mentions (user_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentions_user_source_published
ON public.mentions (user_id, source_type, published_at DESC);
