-- Update sentiment column to integer
-- First, update existing text values to integers
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