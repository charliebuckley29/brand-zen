-- Add fetch frequency to user profiles table
ALTER TABLE public.profiles ADD COLUMN fetch_frequency_minutes integer DEFAULT 15;

-- Update the trigger function to check individual user frequencies
CREATE OR REPLACE FUNCTION public.trigger_mention_fetch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Call the automated-mention-fetch edge function to fetch new mentions
  -- The edge function will handle checking individual user frequencies
  request_id := net.http_post(
    url => 'https://sjypzdqelypxymzzxhxi.supabase.co/functions/v1/automated-mention-fetch',
    headers => jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body => jsonb_build_object('automated', true, 'check_frequencies', true)
  );
  
  RAISE LOG 'Triggered automated mention fetch with frequency checking, request_id = %', request_id;
END;
$$;

-- Update the cron job to run every 5 minutes (but the function will check individual user frequencies)
SELECT cron.unschedule('fetch-mentions-every-5min');

SELECT cron.schedule(
  'fetch-mentions-frequency-check',
  '*/5 * * * *',
  $$SELECT public.trigger_mention_fetch();$$
);