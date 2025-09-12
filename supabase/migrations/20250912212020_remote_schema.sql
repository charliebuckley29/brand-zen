

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."user_type" AS ENUM (
    'moderator',
    'legal_user',
    'pr_user',
    'basic_user',
    'admin'
);


ALTER TYPE "public"."user_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."beat_automation_heartbeat"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE automation_heartbeat SET last_beat = now() WHERE id = 1;
$$;


ALTER FUNCTION "public"."beat_automation_heartbeat"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."call_notify_n8n_new_mention"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'net', 'extensions'
    AS $$
DECLARE
  payload     jsonb;
  request_id  bigint;
BEGIN
  --------------------------------------------------------------
  -- Build the JSON payload sent to N8N.
  -- Adjust the key list if you want to add/remove fields.
  --------------------------------------------------------------
  payload := jsonb_build_object(
    'id'              , NEW.id,
    'keyword_id'      , NEW.keyword_id,
    'user_id'         , NEW.user_id,
    'source_url'      , NEW.source_url,
    'source_name'     , NEW.source_name,
    'published_at'    , NEW.published_at,
    'content_snippet' , NEW.content_snippet,
    'full_text'       , NEW.full_text,
    'source_type'     , NEW.source_type,
    'sentiment'       , NEW.sentiment,
    'escalation_type' , NEW.escalation_type,
    'flagged'         , NEW.flagged
  );

  --------------------------------------------------------------
  -- Fire the async HTTP POST via pg_net.
  -- The request is queued; the transaction will still commit.
  --------------------------------------------------------------
  request_id := net.http_post(
    url     => 'http://n8n-alb-546158790.eu-west-2.elb.amazonaws.com/webhook/enrich-mention',               -- <‑‑ EDIT ME
    body    => payload,
    headers => jsonb_build_object('Content-Type', 'application/json')
  );

  -- Optional: log the request id so you can trace it later.
  RAISE LOG 'N8N webhook queued, request_id = %', request_id;

  -- AFTER INSERT triggers must return the NEW row.
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."call_notify_n8n_new_mention"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_user_fetch"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH user_frequency AS (
    SELECT COALESCE(fetch_frequency_minutes, 15) as frequency_minutes
    FROM profiles 
    WHERE user_id = _user_id
  ),
  last_fetch AS (
    SELECT started_at
    FROM user_fetch_history
    WHERE user_id = _user_id
    ORDER BY started_at DESC
    LIMIT 1
  )
  SELECT CASE
    WHEN last_fetch.started_at IS NULL THEN TRUE
    WHEN EXTRACT(EPOCH FROM (now() - last_fetch.started_at)) / 60 >= user_frequency.frequency_minutes THEN TRUE
    ELSE FALSE
  END
  FROM user_frequency
  LEFT JOIN last_fetch ON true;
$$;


ALTER FUNCTION "public"."can_user_fetch"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_automation_heartbeat"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."check_automation_heartbeat"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detect_user_timezone"("_user_id" "uuid", "_timezone" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE profiles 
  SET timezone = _timezone,
      updated_at = now()
  WHERE user_id = _user_id;
END;
$$;


ALTER FUNCTION "public"."detect_user_timezone"("_user_id" "uuid", "_timezone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_global_setting"("_setting_key" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT setting_value 
  FROM public.global_settings 
  WHERE setting_key = _setting_key
  LIMIT 1
$$;


ALTER FUNCTION "public"."get_global_setting"("_setting_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_emails_for_moderator"() RETURNS TABLE("user_id" "uuid", "email" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  -- Only allow moderators to access this function  
  SELECT au.id as user_id, au.email
  FROM auth.users au
  WHERE has_access_level(auth.uid(), 'moderator'::user_type) = true;
$$;


ALTER FUNCTION "public"."get_user_emails_for_moderator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_type"("_user_id" "uuid") RETURNS "public"."user_type"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT user_type 
  FROM public.user_roles 
  WHERE user_id = _user_id
  LIMIT 1
$$;


ALTER FUNCTION "public"."get_user_type"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only create profile if it doesn't exist yet
  INSERT INTO public.profiles (user_id, full_name, phone_number)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
    NEW.raw_user_meta_data ->> 'phone_number'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, user_type)
  VALUES (NEW.id, 'basic_user');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_access_level"("_user_id" "uuid", "_required_type" "public"."user_type") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT CASE 
    WHEN _required_type = 'basic_user' THEN TRUE
    WHEN _required_type = 'pr_user' THEN get_user_type(_user_id) IN ('admin', 'moderator', 'legal_user', 'pr_user')
    WHEN _required_type = 'legal_user' THEN get_user_type(_user_id) IN ('admin', 'moderator', 'legal_user')
    WHEN _required_type = 'moderator' THEN get_user_type(_user_id) IN ('admin', 'moderator')
    WHEN _required_type = 'admin' THEN get_user_type(_user_id) = 'admin'
    ELSE FALSE
  END
$$;


ALTER FUNCTION "public"."has_access_level"("_user_id" "uuid", "_required_type" "public"."user_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_api_usage"("_api_source" "text", "_endpoint" "text" DEFAULT NULL::"text", "_user_id" "uuid" DEFAULT NULL::"uuid", "_edge_function" "text" DEFAULT NULL::"text", "_response_status" integer DEFAULT 200, "_calls_count" integer DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.api_usage_tracking (
    api_source, 
    endpoint, 
    user_id, 
    edge_function, 
    response_status,
    calls_count
  )
  VALUES (
    _api_source, 
    _endpoint, 
    _user_id, 
    _edge_function, 
    _response_status,
    _calls_count
  );
END;
$$;


ALTER FUNCTION "public"."log_api_usage"("_api_source" "text", "_endpoint" "text", "_user_id" "uuid", "_edge_function" "text", "_response_status" integer, "_calls_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."minutes_until_user_can_fetch"("_user_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH user_frequency AS (
    SELECT COALESCE(fetch_frequency_minutes, 15) as frequency_minutes
    FROM profiles 
    WHERE user_id = _user_id
  ),
  last_fetch AS (
    SELECT started_at
    FROM user_fetch_history
    WHERE user_id = _user_id
    ORDER BY started_at DESC
    LIMIT 1
  )
  SELECT CASE
    WHEN last_fetch.started_at IS NULL THEN 0
    ELSE GREATEST(0, user_frequency.frequency_minutes - EXTRACT(EPOCH FROM (now() - last_fetch.started_at)) / 60)::INTEGER
  END
  FROM user_frequency
  LEFT JOIN last_fetch ON true;
$$;


ALTER FUNCTION "public"."minutes_until_user_can_fetch"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_google_alert_mentions"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."sync_google_alert_mentions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_automated_fetch"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."trigger_automated_fetch"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_mention_fetch"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."trigger_mention_fetch"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_email_by_moderator"("target_user_id" "uuid", "new_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if current user is a moderator
  IF NOT has_access_level(auth.uid(), 'moderator'::user_type) THEN
    RAISE EXCEPTION 'Access denied: Only moderators can update user emails';
  END IF;

  -- Update the user's email in the auth.users table
  UPDATE auth.users 
  SET email = new_email, 
      email_confirmed_at = now(),
      updated_at = now()
  WHERE id = target_user_id;

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."update_user_email_by_moderator"("target_user_id" "uuid", "new_email" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_twilio_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_sid" "text",
    "auth_token" "text",
    "whatsapp_from" "text",
    "sms_from" "text",
    "is_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_twilio_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_name" "text" NOT NULL,
    "api_key" "text",
    "additional_config" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."api_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_usage_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "api_source" "text" NOT NULL,
    "endpoint" "text",
    "calls_count" integer DEFAULT 1 NOT NULL,
    "user_id" "uuid",
    "edge_function" "text",
    "response_status" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."api_usage_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_heartbeat" (
    "id" integer DEFAULT 1 NOT NULL,
    "last_beat" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "automation_heartbeat_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."automation_heartbeat" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb",
    "error_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."automation_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bug_report_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bug_report_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "is_internal" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bug_report_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bug_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "steps_to_reproduce" "text",
    "expected_behavior" "text",
    "actual_behavior" "text",
    "browser_info" "jsonb",
    "console_logs" "text",
    "screenshots" "text"[],
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "assigned_to" "uuid",
    "internal_notes" "text"[],
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    CONSTRAINT "bug_reports_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "bug_reports_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'resolved'::"text", 'closed'::"text", 'wont_fix'::"text"])))
);


ALTER TABLE "public"."bug_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."global_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_key" "text" NOT NULL,
    "setting_value" "jsonb" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."global_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."keywords" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "brand_name" "text" NOT NULL,
    "variants" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "google_alert_rss_url" "text",
    "google_alerts_enabled" boolean DEFAULT true
);


ALTER TABLE "public"."keywords" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mention_exclusions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "keyword_id" "uuid" NOT NULL,
    "source_url" "text" NOT NULL,
    "source_domain" "text",
    "reason" "text" DEFAULT 'not_me'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mention_exclusions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mentions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "keyword_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source_url" "text" NOT NULL,
    "source_name" "text" NOT NULL,
    "published_at" timestamp with time zone NOT NULL,
    "content_snippet" "text" NOT NULL,
    "full_text" "text",
    "sentiment" integer DEFAULT '-1'::integer,
    "topics" "text"[] DEFAULT '{}'::"text"[],
    "flagged" boolean DEFAULT false,
    "escalation_type" "text" DEFAULT 'none'::"text",
    "internal_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_type" "text",
    "cleaned_text" "text",
    "summary" "text",
    "model_used" "text",
    "legal_escalated_at" timestamp with time zone,
    "pr_escalated_at" timestamp with time zone,
    CONSTRAINT "mentions_escalation_type_check" CHECK (("escalation_type" = ANY (ARRAY['none'::"text", 'legal'::"text", 'pr'::"text"]))),
    CONSTRAINT "mentions_sentiment_check" CHECK ((("sentiment" >= '-1'::integer) AND ("sentiment" <= 100))),
    CONSTRAINT "mentions_source_type_check" CHECK (("source_type" = ANY (ARRAY['manual'::"text", 'google_alert'::"text", 'rss'::"text", 'social'::"text", 'web'::"text", 'news'::"text", 'reddit'::"text", 'youtube'::"text"])))
);

ALTER TABLE ONLY "public"."mentions" REPLICA IDENTITY FULL;


ALTER TABLE "public"."mentions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "external_delivery" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."notifications" REPLICA IDENTITY FULL;


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fetch_frequency_minutes" integer DEFAULT 15,
    "automation_enabled" boolean DEFAULT false NOT NULL,
    "timezone" "text" DEFAULT 'UTC'::"text",
    "pr_team_email" "text",
    "legal_team_email" "text",
    "notification_preferences" "jsonb" DEFAULT '{"sms": false, "whatsapp": false}'::"jsonb"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "report_month" "text" NOT NULL,
    "total_mentions" integer DEFAULT 0,
    "negatives" integer DEFAULT 0,
    "positives" integer DEFAULT 0,
    "neutrals" integer DEFAULT 0,
    "top_sources" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."source_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source_type" "text" NOT NULL,
    "show_in_mentions" boolean DEFAULT true NOT NULL,
    "show_in_analytics" boolean DEFAULT true NOT NULL,
    "show_in_reports" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."source_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_fetch_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "fetch_type" "text" DEFAULT 'manual'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "successful_keywords" integer DEFAULT 0,
    "failed_keywords" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_fetch_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_type" "public"."user_type" DEFAULT 'basic_user'::"public"."user_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_twilio_settings"
    ADD CONSTRAINT "admin_twilio_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_source_name_key" UNIQUE ("source_name");



ALTER TABLE ONLY "public"."api_usage_tracking"
    ADD CONSTRAINT "api_usage_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_heartbeat"
    ADD CONSTRAINT "automation_heartbeat_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_logs"
    ADD CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bug_report_comments"
    ADD CONSTRAINT "bug_report_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bug_reports"
    ADD CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_settings"
    ADD CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_settings"
    ADD CONSTRAINT "global_settings_setting_key_key" UNIQUE ("setting_key");



ALTER TABLE ONLY "public"."keywords"
    ADD CONSTRAINT "keywords_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mention_exclusions"
    ADD CONSTRAINT "mention_exclusions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mentions"
    ADD CONSTRAINT "mentions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_user_id_report_month_key" UNIQUE ("user_id", "report_month");



ALTER TABLE ONLY "public"."source_preferences"
    ADD CONSTRAINT "source_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."source_preferences"
    ADD CONSTRAINT "source_preferences_user_source_unique" UNIQUE ("user_id", "source_type");



ALTER TABLE ONLY "public"."user_fetch_history"
    ADD CONSTRAINT "user_fetch_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_api_usage_tracking_created_at" ON "public"."api_usage_tracking" USING "btree" ("created_at");



CREATE INDEX "idx_api_usage_tracking_source" ON "public"."api_usage_tracking" USING "btree" ("api_source");



CREATE INDEX "idx_bug_report_comments_bug_report_id" ON "public"."bug_report_comments" USING "btree" ("bug_report_id");



CREATE INDEX "idx_bug_report_comments_created_at" ON "public"."bug_report_comments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_bug_reports_assigned_to" ON "public"."bug_reports" USING "btree" ("assigned_to");



CREATE INDEX "idx_bug_reports_created_at" ON "public"."bug_reports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_bug_reports_priority" ON "public"."bug_reports" USING "btree" ("priority");



CREATE INDEX "idx_bug_reports_status" ON "public"."bug_reports" USING "btree" ("status");



CREATE INDEX "idx_bug_reports_user_id" ON "public"."bug_reports" USING "btree" ("user_id");



CREATE INDEX "idx_keywords_user_id" ON "public"."keywords" USING "btree" ("user_id");



CREATE INDEX "idx_mention_exclusions_user_keyword" ON "public"."mention_exclusions" USING "btree" ("user_id", "keyword_id");



CREATE INDEX "idx_mentions_flagged" ON "public"."mentions" USING "btree" ("flagged");



CREATE INDEX "idx_mentions_published_at" ON "public"."mentions" USING "btree" ("published_at");



CREATE INDEX "idx_mentions_sentiment" ON "public"."mentions" USING "btree" ("sentiment");



CREATE INDEX "idx_mentions_source_type" ON "public"."mentions" USING "btree" ("source_type");



CREATE INDEX "idx_mentions_user_id" ON "public"."mentions" USING "btree" ("user_id");



CREATE INDEX "idx_mentions_user_published" ON "public"."mentions" USING "btree" ("user_id", "published_at" DESC);



CREATE INDEX "idx_mentions_user_source_published" ON "public"."mentions" USING "btree" ("user_id", "source_type", "published_at" DESC);



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("user_id", "read");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("user_id", "type");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_automation_enabled" ON "public"."profiles" USING "btree" ("automation_enabled") WHERE ("automation_enabled" = true);



CREATE INDEX "idx_profiles_timezone" ON "public"."profiles" USING "btree" ("timezone");



CREATE INDEX "idx_reports_user_id" ON "public"."reports" USING "btree" ("user_id");



CREATE INDEX "idx_user_fetch_history_started_at" ON "public"."user_fetch_history" USING "btree" ("started_at");



CREATE INDEX "idx_user_fetch_history_user_id" ON "public"."user_fetch_history" USING "btree" ("user_id");



CREATE INDEX "mentions_sentiment_null_idx" ON "public"."mentions" USING "btree" ("created_at" DESC) WHERE (("sentiment" IS NULL) OR ("sentiment" = '-1'::integer));



CREATE UNIQUE INDEX "uniq_mention_exclusions_user_keyword_url" ON "public"."mention_exclusions" USING "btree" ("user_id", "keyword_id", "source_url");



CREATE UNIQUE INDEX "uniq_mentions_user_source_url" ON "public"."mentions" USING "btree" ("user_id", "source_url");



CREATE UNIQUE INDEX "uq_keywords_user_id" ON "public"."keywords" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "automation_heartbeat_trigger" AFTER UPDATE ON "public"."automation_heartbeat" FOR EACH ROW EXECUTE FUNCTION "public"."check_automation_heartbeat"();



CREATE OR REPLACE TRIGGER "enqueueMentionsWebhook" AFTER INSERT ON "public"."mentions" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://p1t1v6qjwh.execute-api.eu-west-2.amazonaws.com/mention-event', 'POST', '{"Content-type":"application/json","x-webhook-secret":"supabase-webhook-secret-123"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "n8nNewMention" AFTER INSERT ON "public"."mentions" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('http://n8n-alb-546158790.eu-west-2.elb.amazonaws.com/webhook/enrich-mention', 'POST', '{"Content-type":"application/json"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "notify_n8n_trigger" AFTER INSERT ON "public"."mentions" FOR EACH ROW EXECUTE FUNCTION "public"."call_notify_n8n_new_mention"();



CREATE OR REPLACE TRIGGER "source_preferences_set_updated_at" BEFORE UPDATE ON "public"."source_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_google_alert_sync" AFTER INSERT OR UPDATE ON "public"."keywords" FOR EACH ROW EXECUTE FUNCTION "public"."sync_google_alert_mentions"();



CREATE OR REPLACE TRIGGER "trigger_notify_n8n" AFTER INSERT ON "public"."mentions" FOR EACH ROW EXECUTE FUNCTION "public"."call_notify_n8n_new_mention"();



CREATE OR REPLACE TRIGGER "update_admin_twilio_settings_updated_at" BEFORE UPDATE ON "public"."admin_twilio_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_api_keys_updated_at" BEFORE UPDATE ON "public"."api_keys" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bug_reports_updated_at" BEFORE UPDATE ON "public"."bug_reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_global_settings_updated_at" BEFORE UPDATE ON "public"."global_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_keywords_updated_at" BEFORE UPDATE ON "public"."keywords" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_mentions_updated_at" BEFORE UPDATE ON "public"."mentions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reports_updated_at" BEFORE UPDATE ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_roles_updated_at" BEFORE UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."bug_report_comments"
    ADD CONSTRAINT "bug_report_comments_bug_report_id_fkey" FOREIGN KEY ("bug_report_id") REFERENCES "public"."bug_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bug_report_comments"
    ADD CONSTRAINT "bug_report_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bug_reports"
    ADD CONSTRAINT "bug_reports_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bug_reports"
    ADD CONSTRAINT "bug_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."keywords"
    ADD CONSTRAINT "keywords_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mentions"
    ADD CONSTRAINT "mentions_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mentions"
    ADD CONSTRAINT "mentions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete API keys" ON "public"."api_keys" FOR DELETE USING ("public"."has_access_level"("auth"."uid"(), 'admin'::"public"."user_type"));



CREATE POLICY "Admins can insert API keys" ON "public"."api_keys" FOR INSERT WITH CHECK ("public"."has_access_level"("auth"."uid"(), 'admin'::"public"."user_type"));



CREATE POLICY "Admins can manage Twilio settings" ON "public"."admin_twilio_settings" USING ("public"."has_access_level"("auth"."uid"(), 'admin'::"public"."user_type"));



CREATE POLICY "Admins can update API keys" ON "public"."api_keys" FOR UPDATE USING ("public"."has_access_level"("auth"."uid"(), 'admin'::"public"."user_type"));



CREATE POLICY "Admins can view all API keys" ON "public"."api_keys" FOR SELECT USING ("public"."has_access_level"("auth"."uid"(), 'admin'::"public"."user_type"));



CREATE POLICY "Admins can view all API usage" ON "public"."api_usage_tracking" FOR SELECT USING ("public"."has_access_level"("auth"."uid"(), 'admin'::"public"."user_type"));



CREATE POLICY "Moderators can add comments" ON "public"."bug_report_comments" FOR INSERT WITH CHECK ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can delete bug reports" ON "public"."bug_reports" FOR DELETE USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can delete comments" ON "public"."bug_report_comments" FOR DELETE USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can insert global settings" ON "public"."global_settings" FOR INSERT WITH CHECK ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can insert keywords for any user" ON "public"."keywords" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can insert profiles for any user" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can insert user roles" ON "public"."user_roles" FOR INSERT WITH CHECK ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can update all bug reports" ON "public"."bug_reports" FOR UPDATE USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can update all keywords" ON "public"."keywords" FOR UPDATE USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can update all mentions" ON "public"."mentions" FOR UPDATE USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can update all profiles" ON "public"."profiles" FOR UPDATE USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can update comments" ON "public"."bug_report_comments" FOR UPDATE USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can update global settings" ON "public"."global_settings" FOR UPDATE USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can update user roles" ON "public"."user_roles" FOR UPDATE USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can view all bug reports" ON "public"."bug_reports" FOR SELECT USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can view all comments" ON "public"."bug_report_comments" FOR SELECT USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can view all fetch history" ON "public"."user_fetch_history" FOR SELECT USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can view all global settings" ON "public"."global_settings" FOR SELECT USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can view all keywords" ON "public"."keywords" FOR SELECT USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can view all mentions" ON "public"."mentions" FOR SELECT USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can view all notifications" ON "public"."notifications" FOR SELECT USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can view all profiles" ON "public"."profiles" FOR SELECT USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Moderators can view all roles" ON "public"."user_roles" FOR SELECT USING ("public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"));



CREATE POLICY "Service role can access automation heartbeat" ON "public"."automation_heartbeat" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can insert API usage" ON "public"."api_usage_tracking" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can insert notifications for any user" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "System can update fetch history" ON "public"."user_fetch_history" FOR UPDATE USING (true);



CREATE POLICY "Users can comment on their bug reports" ON "public"."bug_report_comments" FOR INSERT WITH CHECK ((("bug_report_id" IN ( SELECT "bug_reports"."id"
   FROM "public"."bug_reports"
  WHERE ("bug_reports"."user_id" = "auth"."uid"()))) AND ("auth"."uid"() = "user_id") AND ("is_internal" = false)));



CREATE POLICY "Users can create bug reports" ON "public"."bug_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own keywords" ON "public"."keywords" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own mentions" ON "public"."mentions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own reports" ON "public"."reports" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own exclusions" ON "public"."mention_exclusions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own keywords" ON "public"."keywords" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own mentions" ON "public"."mentions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own reports" ON "public"."reports" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own source preferences" ON "public"."source_preferences" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own exclusions" ON "public"."mention_exclusions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own fetch history" ON "public"."user_fetch_history" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own source preferences" ON "public"."source_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own bug reports" ON "public"."bug_reports" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own exclusions" ON "public"."mention_exclusions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own keywords" ON "public"."keywords" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own mentions" ON "public"."mentions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own reports" ON "public"."reports" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own source preferences" ON "public"."source_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view automation logs" ON "public"."automation_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view comments on their bug reports" ON "public"."bug_report_comments" FOR SELECT USING ((("bug_report_id" IN ( SELECT "bug_reports"."id"
   FROM "public"."bug_reports"
  WHERE ("bug_reports"."user_id" = "auth"."uid"()))) AND (("is_internal" = false) OR "public"."has_access_level"("auth"."uid"(), 'moderator'::"public"."user_type"))));



CREATE POLICY "Users can view their own bug reports" ON "public"."bug_reports" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own exclusions" ON "public"."mention_exclusions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own fetch history" ON "public"."user_fetch_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own keywords" ON "public"."keywords" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own mentions" ON "public"."mentions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own reports" ON "public"."reports" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own role" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own source preferences" ON "public"."source_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."admin_twilio_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_usage_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automation_heartbeat" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automation_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bug_report_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bug_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."global_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."keywords" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mention_exclusions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mentions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."source_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_fetch_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."mentions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."beat_automation_heartbeat"() TO "anon";
GRANT ALL ON FUNCTION "public"."beat_automation_heartbeat"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."beat_automation_heartbeat"() TO "service_role";



GRANT ALL ON FUNCTION "public"."call_notify_n8n_new_mention"() TO "anon";
GRANT ALL ON FUNCTION "public"."call_notify_n8n_new_mention"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."call_notify_n8n_new_mention"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_user_fetch"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_user_fetch"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_user_fetch"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_automation_heartbeat"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_automation_heartbeat"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_automation_heartbeat"() TO "service_role";



GRANT ALL ON FUNCTION "public"."detect_user_timezone"("_user_id" "uuid", "_timezone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."detect_user_timezone"("_user_id" "uuid", "_timezone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_user_timezone"("_user_id" "uuid", "_timezone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_global_setting"("_setting_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_global_setting"("_setting_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_global_setting"("_setting_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_emails_for_moderator"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_emails_for_moderator"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_emails_for_moderator"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_type"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_type"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_type"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_access_level"("_user_id" "uuid", "_required_type" "public"."user_type") TO "anon";
GRANT ALL ON FUNCTION "public"."has_access_level"("_user_id" "uuid", "_required_type" "public"."user_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_access_level"("_user_id" "uuid", "_required_type" "public"."user_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_api_usage"("_api_source" "text", "_endpoint" "text", "_user_id" "uuid", "_edge_function" "text", "_response_status" integer, "_calls_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."log_api_usage"("_api_source" "text", "_endpoint" "text", "_user_id" "uuid", "_edge_function" "text", "_response_status" integer, "_calls_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_api_usage"("_api_source" "text", "_endpoint" "text", "_user_id" "uuid", "_edge_function" "text", "_response_status" integer, "_calls_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."minutes_until_user_can_fetch"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."minutes_until_user_can_fetch"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."minutes_until_user_can_fetch"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_google_alert_mentions"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_google_alert_mentions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_google_alert_mentions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_automated_fetch"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_automated_fetch"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_automated_fetch"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_mention_fetch"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_mention_fetch"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_mention_fetch"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_email_by_moderator"("target_user_id" "uuid", "new_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_email_by_moderator"("target_user_id" "uuid", "new_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_email_by_moderator"("target_user_id" "uuid", "new_email" "text") TO "service_role";
























GRANT ALL ON TABLE "public"."admin_twilio_settings" TO "anon";
GRANT ALL ON TABLE "public"."admin_twilio_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_twilio_settings" TO "service_role";



GRANT ALL ON TABLE "public"."api_keys" TO "anon";
GRANT ALL ON TABLE "public"."api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."api_usage_tracking" TO "anon";
GRANT ALL ON TABLE "public"."api_usage_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."api_usage_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."automation_heartbeat" TO "anon";
GRANT ALL ON TABLE "public"."automation_heartbeat" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_heartbeat" TO "service_role";



GRANT ALL ON TABLE "public"."automation_logs" TO "anon";
GRANT ALL ON TABLE "public"."automation_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_logs" TO "service_role";



GRANT ALL ON TABLE "public"."bug_report_comments" TO "anon";
GRANT ALL ON TABLE "public"."bug_report_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."bug_report_comments" TO "service_role";



GRANT ALL ON TABLE "public"."bug_reports" TO "anon";
GRANT ALL ON TABLE "public"."bug_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."bug_reports" TO "service_role";



GRANT ALL ON TABLE "public"."global_settings" TO "anon";
GRANT ALL ON TABLE "public"."global_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."global_settings" TO "service_role";



GRANT ALL ON TABLE "public"."keywords" TO "anon";
GRANT ALL ON TABLE "public"."keywords" TO "authenticated";
GRANT ALL ON TABLE "public"."keywords" TO "service_role";



GRANT ALL ON TABLE "public"."mention_exclusions" TO "anon";
GRANT ALL ON TABLE "public"."mention_exclusions" TO "authenticated";
GRANT ALL ON TABLE "public"."mention_exclusions" TO "service_role";



GRANT ALL ON TABLE "public"."mentions" TO "anon";
GRANT ALL ON TABLE "public"."mentions" TO "authenticated";
GRANT ALL ON TABLE "public"."mentions" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."source_preferences" TO "anon";
GRANT ALL ON TABLE "public"."source_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."source_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_fetch_history" TO "anon";
GRANT ALL ON TABLE "public"."user_fetch_history" TO "authenticated";
GRANT ALL ON TABLE "public"."user_fetch_history" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
