-- Enable realtime for mentions table
ALTER TABLE public.mentions REPLICA IDENTITY FULL;

-- Add mentions table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentions;

-- Create a function to automatically fetch mentions
CREATE OR REPLACE FUNCTION public.trigger_mention_fetch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Call the aggregate-sources edge function to fetch new mentions
  request_id := net.http_post(
    url => 'https://sjypzdqelypxymzzxhxi.supabase.co/functions/v1/aggregate-sources',
    headers => jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body => jsonb_build_object('automated', true)
  );
  
  RAISE LOG 'Triggered mention fetch, request_id = %', request_id;
END;
$$;

-- Schedule mention fetching every 5 minutes using pg_cron
SELECT cron.schedule(
  'fetch-mentions-every-5min',
  '*/5 * * * *',
  $$SELECT public.trigger_mention_fetch();$$
);