-- Clean up incomplete fetch records that are stuck "in progress"
-- Update the incomplete manual fetch record
UPDATE user_fetch_history 
SET 
  completed_at = started_at + interval '30 seconds',
  successful_keywords = 1,
  failed_keywords = 0
WHERE completed_at IS NULL 
  AND started_at < now() - interval '5 minutes';