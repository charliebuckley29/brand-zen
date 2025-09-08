-- Fix the trigger function to use correct service key reference
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
  request_id := net.http_post(
    url => 'https://sjypzdqelypxymzzxhxi.supabase.co/functions/v1/automated-mention-fetch',
    headers => jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body => jsonb_build_object('automated', true)
  );
  
  RAISE LOG 'Triggered automated mention fetch, request_id = %', request_id;
END;
$$;