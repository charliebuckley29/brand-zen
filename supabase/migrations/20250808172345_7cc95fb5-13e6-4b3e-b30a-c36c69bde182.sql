-- Deduplicate existing keywords per user (keep the most recent)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.keywords
)
DELETE FROM public.keywords k
USING ranked r
WHERE k.id = r.id
AND r.rn > 1;

-- Enforce one brand per user
CREATE UNIQUE INDEX IF NOT EXISTS uq_keywords_user_id ON public.keywords (user_id);
