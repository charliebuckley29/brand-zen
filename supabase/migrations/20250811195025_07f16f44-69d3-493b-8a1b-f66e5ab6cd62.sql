-- Create table to record user-specific brand exclusions
CREATE TABLE IF NOT EXISTS public.mention_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  keyword_id UUID NOT NULL,
  source_url TEXT NOT NULL,
  source_domain TEXT,
  reason TEXT NOT NULL DEFAULT 'not_me',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Useful index and uniqueness to avoid duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mention_exclusions_user_keyword_url
  ON public.mention_exclusions (user_id, keyword_id, source_url);

CREATE INDEX IF NOT EXISTS idx_mention_exclusions_user_keyword
  ON public.mention_exclusions (user_id, keyword_id);

-- Enable RLS and policies
ALTER TABLE public.mention_exclusions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mention_exclusions' AND policyname = 'Users can view their own exclusions'
  ) THEN
    CREATE POLICY "Users can view their own exclusions"
      ON public.mention_exclusions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mention_exclusions' AND policyname = 'Users can insert their own exclusions'
  ) THEN
    CREATE POLICY "Users can insert their own exclusions"
      ON public.mention_exclusions
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mention_exclusions' AND policyname = 'Users can delete their own exclusions'
  ) THEN
    CREATE POLICY "Users can delete their own exclusions"
      ON public.mention_exclusions
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mention_exclusions' AND policyname = 'Users can update their own exclusions'
  ) THEN
    CREATE POLICY "Users can update their own exclusions"
      ON public.mention_exclusions
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;