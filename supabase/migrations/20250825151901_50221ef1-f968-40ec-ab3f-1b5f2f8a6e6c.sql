-- Drop existing check constraint on sentiment
ALTER TABLE public.mentions DROP CONSTRAINT IF EXISTS mentions_sentiment_check;

-- Update existing text values to integers
UPDATE public.mentions SET sentiment = 
  CASE 
    WHEN sentiment = 'positive' THEN '100'
    WHEN sentiment = 'negative' THEN '0'
    WHEN sentiment = 'neutral' THEN '50'
    ELSE '-1'
  END
WHERE sentiment IS NOT NULL;

-- Change column type to integer
ALTER TABLE public.mentions ALTER COLUMN sentiment TYPE integer USING sentiment::integer;

-- Set default value for new records
ALTER TABLE public.mentions ALTER COLUMN sentiment SET DEFAULT -1;

-- Add new check constraint for integer values
ALTER TABLE public.mentions ADD CONSTRAINT mentions_sentiment_check 
  CHECK (sentiment >= -1 AND sentiment <= 100);