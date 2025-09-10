-- Create a cron job to run the automated scheduler every 5 minutes
-- This will check for users with automation enabled and trigger fetches for those who are due

SELECT cron.schedule(
  'automated-mention-scheduler',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://sjypzdqelypxymzzxhxi.supabase.co/functions/v1/automated-scheduler',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqeXB6ZHFlbHlweHltenp4aHhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU4NDg2NCwiZXhwIjoyMDcwMTYwODY0fQ.AOhJdQUgpiTRlTvE1gdFHcgPeCcFWEzD80R-9dRz8OE"}'::jsonb,
    body := '{"automated": true}'::jsonb
  );
  $$
);