-- Remove the global unique constraint on source_url 
-- This allows the same URL to be inserted for different users/keywords
-- while still maintaining user-specific deduplication via existing constraints
ALTER TABLE mentions DROP CONSTRAINT IF EXISTS mentions_source_url_key;

-- Clean up duplicate user-specific constraints (keep only one)
DROP INDEX IF EXISTS uniq_mentions_user_url;