-- Enable RLS on automation_heartbeat table
ALTER TABLE public.automation_heartbeat ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for automation_heartbeat (this is a system table, only allow service role access)
CREATE POLICY "Service role can access automation heartbeat" 
ON public.automation_heartbeat 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Fix search path for functions that don't have it set
CREATE OR REPLACE FUNCTION public.sync_google_alert_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- When a new RSS URL is added or updated
    IF NEW.google_alert_rss_url IS NOT NULL AND 
       (OLD.google_alert_rss_url IS NULL OR OLD.google_alert_rss_url != NEW.google_alert_rss_url) THEN
        -- Trigger mention sync (handled by Edge Function)
        PERFORM pg_notify('google_alert_updated', json_build_object(
            'keyword_id', NEW.id,
            'rss_url', NEW.google_alert_rss_url
        )::text);
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_automation_heartbeat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  last_global_fetch timestamp with time zone;
  time_since_fetch interval;
BEGIN
  -- Get the last global fetch time
  SELECT setting_value::timestamp with time zone INTO last_global_fetch
  FROM global_settings 
  WHERE setting_key = 'last_global_fetch'
  AND setting_value != '"null"' 
  AND setting_value != 'null';
  
  -- If never fetched or more than 5 minutes since last fetch
  time_since_fetch := now() - COALESCE(last_global_fetch, '1970-01-01'::timestamp with time zone);
  
  IF time_since_fetch > interval '5 minutes' THEN
    -- Trigger the automated fetch
    PERFORM trigger_automated_fetch();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_automated_fetch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  response_data jsonb;
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get configuration from environment or settings
  -- In production, these would be configured via Supabase dashboard
  supabase_url := current_setting('app.supabase_url', true);
  service_role_key := current_setting('app.service_role_key', true);
  
  -- If not configured, try to get from global_settings table
  IF supabase_url IS NULL THEN
    SELECT setting_value::text INTO supabase_url 
    FROM global_settings 
    WHERE setting_key = 'supabase_url';
  END IF;
  
  -- Log the automation trigger
  INSERT INTO automation_logs (event_type, message, created_at)
  VALUES ('automated_fetch_triggered', 'Database cron triggered automated fetch', now());
  
  -- Use the http extension to call the edge function
  -- Note: This requires the http extension to be enabled
  BEGIN
    SELECT content::jsonb INTO response_data
    FROM http((
      'POST',
      supabase_url || '/functions/v1/automated-fetch',
      ARRAY[
        http_header('Authorization', 'Bearer ' || service_role_key),
        http_header('Content-Type', 'application/json')
      ],
      'application/json',
      '{}'
    )::http_request);
    
    -- Log successful execution
    INSERT INTO automation_logs (event_type, message, data, created_at)
    VALUES ('automated_fetch_success', 'Automated fetch completed successfully', response_data, now());
    
  EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO automation_logs (event_type, message, error_details, created_at)
    VALUES ('automated_fetch_error', 'Automated fetch failed', 
            jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE), now());
    
    RAISE NOTICE 'Automated fetch failed: %', SQLERRM;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.beat_automation_heartbeat()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE automation_heartbeat SET last_beat = now() WHERE id = 1;
$$;