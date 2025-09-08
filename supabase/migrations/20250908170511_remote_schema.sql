create type "public"."user_type" as enum ('moderator', 'legal_user', 'pr_user', 'basic_user', 'admin');


  create table "public"."api_keys" (
    "id" uuid not null default gen_random_uuid(),
    "source_name" text not null,
    "api_key" text,
    "additional_config" jsonb default '{}'::jsonb,
    "is_active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."api_keys" enable row level security;


  create table "public"."global_settings" (
    "id" uuid not null default gen_random_uuid(),
    "setting_key" text not null,
    "setting_value" jsonb not null,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."global_settings" enable row level security;


  create table "public"."keywords" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "brand_name" text not null,
    "variants" text[] default '{}'::text[],
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "google_alert_rss_url" text,
    "google_alerts_enabled" boolean default true
      );


alter table "public"."keywords" enable row level security;


  create table "public"."mention_exclusions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "keyword_id" uuid not null,
    "source_url" text not null,
    "source_domain" text,
    "reason" text not null default 'not_me'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."mention_exclusions" enable row level security;


  create table "public"."mentions" (
    "id" uuid not null default gen_random_uuid(),
    "keyword_id" uuid not null,
    "user_id" uuid not null,
    "source_url" text not null,
    "source_name" text not null,
    "published_at" timestamp with time zone not null,
    "content_snippet" text not null,
    "full_text" text,
    "sentiment" integer default '-1'::integer,
    "topics" text[] default '{}'::text[],
    "flagged" boolean default false,
    "escalation_type" text default 'none'::text,
    "internal_notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "source_type" text,
    "cleaned_text" text,
    "summary" text,
    "model_used" text
      );


alter table "public"."mentions" enable row level security;


  create table "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "title" text not null,
    "message" text not null,
    "type" text not null default 'info'::text,
    "read" boolean not null default false,
    "data" jsonb default '{}'::jsonb,
    "external_delivery" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."notifications" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "full_name" text not null,
    "phone_number" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "fetch_frequency_minutes" integer default 15
      );


alter table "public"."profiles" enable row level security;


  create table "public"."reports" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "report_month" text not null,
    "total_mentions" integer default 0,
    "negatives" integer default 0,
    "positives" integer default 0,
    "neutrals" integer default 0,
    "top_sources" text[] default '{}'::text[],
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."reports" enable row level security;


  create table "public"."source_preferences" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "source_type" text not null,
    "show_in_mentions" boolean not null default true,
    "show_in_analytics" boolean not null default true,
    "show_in_reports" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."source_preferences" enable row level security;


  create table "public"."user_roles" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "user_type" user_type not null default 'basic_user'::user_type,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."user_roles" enable row level security;

CREATE UNIQUE INDEX api_keys_pkey ON public.api_keys USING btree (id);

CREATE UNIQUE INDEX api_keys_source_name_key ON public.api_keys USING btree (source_name);

CREATE UNIQUE INDEX global_settings_pkey ON public.global_settings USING btree (id);

CREATE UNIQUE INDEX global_settings_setting_key_key ON public.global_settings USING btree (setting_key);

CREATE INDEX idx_keywords_user_id ON public.keywords USING btree (user_id);

CREATE INDEX idx_mention_exclusions_user_keyword ON public.mention_exclusions USING btree (user_id, keyword_id);

CREATE INDEX idx_mentions_flagged ON public.mentions USING btree (flagged);

CREATE INDEX idx_mentions_published_at ON public.mentions USING btree (published_at);

CREATE INDEX idx_mentions_sentiment ON public.mentions USING btree (sentiment);

CREATE INDEX idx_mentions_source_type ON public.mentions USING btree (source_type);

CREATE INDEX idx_mentions_user_id ON public.mentions USING btree (user_id);

CREATE INDEX idx_mentions_user_published ON public.mentions USING btree (user_id, published_at DESC);

CREATE INDEX idx_mentions_user_source_published ON public.mentions USING btree (user_id, source_type, published_at DESC);

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);

CREATE INDEX idx_notifications_read ON public.notifications USING btree (user_id, read);

CREATE INDEX idx_notifications_type ON public.notifications USING btree (user_id, type);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX idx_reports_user_id ON public.reports USING btree (user_id);

CREATE UNIQUE INDEX keywords_pkey ON public.keywords USING btree (id);

CREATE UNIQUE INDEX mention_exclusions_pkey ON public.mention_exclusions USING btree (id);

CREATE UNIQUE INDEX mentions_pkey ON public.mentions USING btree (id);

CREATE UNIQUE INDEX mentions_source_url_key ON public.mentions USING btree (source_url);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX reports_pkey ON public.reports USING btree (id);

CREATE UNIQUE INDEX reports_user_id_report_month_key ON public.reports USING btree (user_id, report_month);

CREATE UNIQUE INDEX source_preferences_pkey ON public.source_preferences USING btree (id);

CREATE UNIQUE INDEX source_preferences_user_source_unique ON public.source_preferences USING btree (user_id, source_type);

CREATE UNIQUE INDEX uniq_mention_exclusions_user_keyword_url ON public.mention_exclusions USING btree (user_id, keyword_id, source_url);

CREATE UNIQUE INDEX uniq_mentions_user_source_url ON public.mentions USING btree (user_id, source_url);

CREATE UNIQUE INDEX uniq_mentions_user_url ON public.mentions USING btree (user_id, source_url);

CREATE UNIQUE INDEX uq_keywords_user_id ON public.keywords USING btree (user_id);

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id);

CREATE UNIQUE INDEX user_roles_user_id_key ON public.user_roles USING btree (user_id);

alter table "public"."api_keys" add constraint "api_keys_pkey" PRIMARY KEY using index "api_keys_pkey";

alter table "public"."global_settings" add constraint "global_settings_pkey" PRIMARY KEY using index "global_settings_pkey";

alter table "public"."keywords" add constraint "keywords_pkey" PRIMARY KEY using index "keywords_pkey";

alter table "public"."mention_exclusions" add constraint "mention_exclusions_pkey" PRIMARY KEY using index "mention_exclusions_pkey";

alter table "public"."mentions" add constraint "mentions_pkey" PRIMARY KEY using index "mentions_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."reports" add constraint "reports_pkey" PRIMARY KEY using index "reports_pkey";

alter table "public"."source_preferences" add constraint "source_preferences_pkey" PRIMARY KEY using index "source_preferences_pkey";

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "public"."api_keys" add constraint "api_keys_source_name_key" UNIQUE using index "api_keys_source_name_key";

alter table "public"."global_settings" add constraint "global_settings_setting_key_key" UNIQUE using index "global_settings_setting_key_key";

alter table "public"."keywords" add constraint "keywords_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."keywords" validate constraint "keywords_user_id_fkey";

alter table "public"."mentions" add constraint "mentions_escalation_type_check" CHECK ((escalation_type = ANY (ARRAY['none'::text, 'legal'::text, 'pr'::text]))) not valid;

alter table "public"."mentions" validate constraint "mentions_escalation_type_check";

alter table "public"."mentions" add constraint "mentions_keyword_id_fkey" FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE not valid;

alter table "public"."mentions" validate constraint "mentions_keyword_id_fkey";

alter table "public"."mentions" add constraint "mentions_sentiment_check" CHECK (((sentiment >= '-1'::integer) AND (sentiment <= 100))) not valid;

alter table "public"."mentions" validate constraint "mentions_sentiment_check";

alter table "public"."mentions" add constraint "mentions_source_type_check" CHECK ((source_type = ANY (ARRAY['manual'::text, 'google_alert'::text, 'rss'::text, 'social'::text, 'web'::text, 'news'::text, 'reddit'::text, 'youtube'::text]))) not valid;

alter table "public"."mentions" validate constraint "mentions_source_type_check";

alter table "public"."mentions" add constraint "mentions_source_url_key" UNIQUE using index "mentions_source_url_key";

alter table "public"."mentions" add constraint "mentions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."mentions" validate constraint "mentions_user_id_fkey";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_key" UNIQUE using index "profiles_user_id_key";

alter table "public"."reports" add constraint "reports_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."reports" validate constraint "reports_user_id_fkey";

alter table "public"."reports" add constraint "reports_user_id_report_month_key" UNIQUE using index "reports_user_id_report_month_key";

alter table "public"."source_preferences" add constraint "source_preferences_user_source_unique" UNIQUE using index "source_preferences_user_source_unique";

alter table "public"."user_roles" add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_key" UNIQUE using index "user_roles_user_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.call_notify_n8n_new_mention()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_global_setting(_setting_key text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT setting_value 
  FROM public.global_settings 
  WHERE setting_key = _setting_key
  LIMIT 1
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_emails_for_moderator()
 RETURNS TABLE(user_id uuid, email text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Only allow moderators to access this function  
  SELECT au.id as user_id, au.email
  FROM auth.users au
  WHERE has_access_level(auth.uid(), 'moderator'::user_type) = true;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_type(_user_id uuid)
 RETURNS user_type
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT user_type 
  FROM public.user_roles 
  WHERE user_id = _user_id
  LIMIT 1
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, user_type)
  VALUES (NEW.id, 'basic_user');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_access_level(_user_id uuid, _required_type user_type)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE 
    WHEN _required_type = 'basic_user' THEN TRUE
    WHEN _required_type = 'pr_user' THEN get_user_type(_user_id) IN ('admin', 'moderator', 'legal_user', 'pr_user')
    WHEN _required_type = 'legal_user' THEN get_user_type(_user_id) IN ('admin', 'moderator', 'legal_user')
    WHEN _required_type = 'moderator' THEN get_user_type(_user_id) IN ('admin', 'moderator')
    WHEN _required_type = 'admin' THEN get_user_type(_user_id) = 'admin'
    ELSE FALSE
  END
$function$
;

CREATE OR REPLACE FUNCTION public.sync_google_alert_mentions()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_mention_fetch()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_email_by_moderator(target_user_id uuid, new_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;


  create policy "Admins can delete API keys"
  on "public"."api_keys"
  as permissive
  for delete
  to public
using (has_access_level(auth.uid(), 'admin'::user_type));



  create policy "Admins can insert API keys"
  on "public"."api_keys"
  as permissive
  for insert
  to public
with check (has_access_level(auth.uid(), 'admin'::user_type));



  create policy "Admins can update API keys"
  on "public"."api_keys"
  as permissive
  for update
  to public
using (has_access_level(auth.uid(), 'admin'::user_type));



  create policy "Admins can view all API keys"
  on "public"."api_keys"
  as permissive
  for select
  to public
using (has_access_level(auth.uid(), 'admin'::user_type));



  create policy "Moderators can insert global settings"
  on "public"."global_settings"
  as permissive
  for insert
  to public
with check (has_access_level(auth.uid(), 'moderator'::user_type));



  create policy "Moderators can update global settings"
  on "public"."global_settings"
  as permissive
  for update
  to public
using (has_access_level(auth.uid(), 'moderator'::user_type));



  create policy "Moderators can view all global settings"
  on "public"."global_settings"
  as permissive
  for select
  to public
using (has_access_level(auth.uid(), 'moderator'::user_type));



  create policy "Moderators can insert keywords for any user"
  on "public"."keywords"
  as permissive
  for insert
  to authenticated
with check (has_access_level(auth.uid(), 'moderator'::user_type));



  create policy "Moderators can update all keywords"
  on "public"."keywords"
  as permissive
  for update
  to public
using (has_access_level(auth.uid(), 'moderator'::user_type));



  create policy "Moderators can view all keywords"
  on "public"."keywords"
  as permissive
  for select
  to public
using (has_access_level(auth.uid(), 'moderator'::user_type));



  create policy "Users can create their own keywords"
  on "public"."keywords"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete their own keywords"
  on "public"."keywords"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own keywords"
  on "public"."keywords"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own keywords"
  on "public"."keywords"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can delete their own exclusions"
  on "public"."mention_exclusions"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own exclusions"
  on "public"."mention_exclusions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own exclusions"
  on "public"."mention_exclusions"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own exclusions"
  on "public"."mention_exclusions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Moderators can update all mentions"
  on "public"."mentions"
  as permissive
  for update
  to public
using (has_access_level(auth.uid(), 'moderator'::user_type));



  create policy "Moderators can view all mentions"
  on "public"."mentions"
  as permissive
  for select
  to public
using (has_access_level(auth.uid(), 'moderator'::user_type));



  create policy "Users can create their own mentions"
  on "public"."mentions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete their own mentions"
  on "public"."mentions"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own mentions"
  on "public"."mentions"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own mentions"
  on "public"."mentions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Moderators can view all notifications"
  on "public"."notifications"
  as permissive
  for select
  to public
using (has_access_level(auth.uid(), 'moderator'::user_type));



  create policy "Service role can insert notifications for any user"
  on "public"."notifications"
  as permissive
  for insert
  to public
with check ((auth.role() = 'service_role'::text));



  create policy "Users can delete their own notifications"
  on "public"."notifications"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own notifications"
  on "public"."notifications"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own notifications"
  on "public"."notifications"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own notifications"
  on "public"."notifications"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Moderators can insert profiles for any user"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check (has_access_level(auth.uid(), 'moderator'::user_type));



  create policy "Moderators can update all profiles"
  on "public"."profiles"
  as permissive
  for update
  to public
using (has_access_level(auth.uid(), 'moderator'::user_type));



  create policy "Moderators can view all profiles"
  on "public"."profiles"
  as permissive
  for select
  to public
using (has_access_level(auth.uid(), 'moderator'::user_type));



  create policy "Users can insert their own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can create their own reports"
  on "public"."reports"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete their own reports"
  on "public"."reports"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own reports"
  on "public"."reports"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own reports"
  on "public"."reports"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can delete their own source preferences"
  on "public"."source_preferences"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own source preferences"
  on "public"."source_preferences"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own source preferences"
  on "public"."source_preferences"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own source preferences"
  on "public"."source_preferences"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Moderators can insert user roles"
  on "public"."user_roles"
  as permissive
  for insert
  to public
with check (has_access_level(auth.uid(), 'moderator'::user_type));



  create policy "Moderators can update user roles"
  on "public"."user_roles"
  as permissive
  for update
  to public
using (has_access_level(auth.uid(), 'moderator'::user_type));



  create policy "Moderators can view all roles"
  on "public"."user_roles"
  as permissive
  for select
  to public
using (has_access_level(auth.uid(), 'moderator'::user_type));



  create policy "Users can view their own role"
  on "public"."user_roles"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_settings_updated_at BEFORE UPDATE ON public.global_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_google_alert_sync AFTER INSERT OR UPDATE ON public.keywords FOR EACH ROW EXECUTE FUNCTION sync_google_alert_mentions();

CREATE TRIGGER update_keywords_updated_at BEFORE UPDATE ON public.keywords FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER "enqueueMentionsWebhook" AFTER INSERT ON public.mentions FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://p1t1v6qjwh.execute-api.eu-west-2.amazonaws.com/mention-event', 'POST', '{"Content-type":"application/json","x-webhook-secret":"supabase-webhook-secret-123"}', '{}', '5000');

CREATE TRIGGER "n8nNewMention" AFTER INSERT ON public.mentions FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('http://n8n-alb-546158790.eu-west-2.elb.amazonaws.com/webhook/enrich-mention', 'POST', '{"Content-type":"application/json"}', '{}', '5000');

CREATE TRIGGER notify_n8n_trigger AFTER INSERT ON public.mentions FOR EACH ROW EXECUTE FUNCTION call_notify_n8n_new_mention();

CREATE TRIGGER trigger_notify_n8n AFTER INSERT ON public.mentions FOR EACH ROW EXECUTE FUNCTION call_notify_n8n_new_mention();

CREATE TRIGGER update_mentions_updated_at BEFORE UPDATE ON public.mentions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER source_preferences_set_updated_at BEFORE UPDATE ON public.source_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


