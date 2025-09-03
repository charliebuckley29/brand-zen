
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

CREATE INDEX idx_keywords_user_id ON public.keywords USING btree (user_id);

CREATE INDEX idx_mention_exclusions_user_keyword ON public.mention_exclusions USING btree (user_id, keyword_id);

CREATE INDEX idx_mentions_flagged ON public.mentions USING btree (flagged);

CREATE INDEX idx_mentions_published_at ON public.mentions USING btree (published_at);

CREATE INDEX idx_mentions_sentiment ON public.mentions USING btree (sentiment);

CREATE INDEX idx_mentions_source_type ON public.mentions USING btree (source_type);

CREATE INDEX idx_mentions_user_id ON public.mentions USING btree (user_id);

CREATE INDEX idx_mentions_user_published ON public.mentions USING btree (user_id, published_at DESC);

CREATE INDEX idx_mentions_user_source_published ON public.mentions USING btree (user_id, source_type, published_at DESC);

CREATE INDEX idx_reports_user_id ON public.reports USING btree (user_id);

CREATE UNIQUE INDEX keywords_pkey ON public.keywords USING btree (id);

CREATE UNIQUE INDEX mention_exclusions_pkey ON public.mention_exclusions USING btree (id);

CREATE UNIQUE INDEX mentions_pkey ON public.mentions USING btree (id);

CREATE UNIQUE INDEX mentions_source_url_key ON public.mentions USING btree (source_url);

CREATE UNIQUE INDEX reports_pkey ON public.reports USING btree (id);

CREATE UNIQUE INDEX reports_user_id_report_month_key ON public.reports USING btree (user_id, report_month);

CREATE UNIQUE INDEX source_preferences_pkey ON public.source_preferences USING btree (id);

CREATE UNIQUE INDEX source_preferences_user_source_unique ON public.source_preferences USING btree (user_id, source_type);

CREATE UNIQUE INDEX uniq_mention_exclusions_user_keyword_url ON public.mention_exclusions USING btree (user_id, keyword_id, source_url);

CREATE UNIQUE INDEX uniq_mentions_user_source_url ON public.mentions USING btree (user_id, source_url);

CREATE UNIQUE INDEX uniq_mentions_user_url ON public.mentions USING btree (user_id, source_url);

CREATE UNIQUE INDEX uq_keywords_user_id ON public.keywords USING btree (user_id);

alter table "public"."keywords" add constraint "keywords_pkey" PRIMARY KEY using index "keywords_pkey";

alter table "public"."mention_exclusions" add constraint "mention_exclusions_pkey" PRIMARY KEY using index "mention_exclusions_pkey";

alter table "public"."mentions" add constraint "mentions_pkey" PRIMARY KEY using index "mentions_pkey";

alter table "public"."reports" add constraint "reports_pkey" PRIMARY KEY using index "reports_pkey";

alter table "public"."source_preferences" add constraint "source_preferences_pkey" PRIMARY KEY using index "source_preferences_pkey";

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

alter table "public"."reports" add constraint "reports_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."reports" validate constraint "reports_user_id_fkey";

alter table "public"."reports" add constraint "reports_user_id_report_month_key" UNIQUE using index "reports_user_id_report_month_key";

alter table "public"."source_preferences" add constraint "source_preferences_user_source_unique" UNIQUE using index "source_preferences_user_source_unique";

set check_function_bodies = off;

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


CREATE TRIGGER trigger_google_alert_sync AFTER INSERT OR UPDATE ON public.keywords FOR EACH ROW EXECUTE FUNCTION sync_google_alert_mentions();

CREATE TRIGGER update_keywords_updated_at BEFORE UPDATE ON public.keywords FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER "enqueueMentionsWebhook" AFTER INSERT ON public.mentions FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://p1t1v6qjwh.execute-api.eu-west-2.amazonaws.com/mention-event', 'POST', '{"Content-type":"application/json","x-webhook-secret":"supabase-webhook-secret-123"}', '{}', '5000');

CREATE TRIGGER "n8nNewMention" AFTER INSERT ON public.mentions FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('http://n8n-alb-546158790.eu-west-2.elb.amazonaws.com/webhook/enrich-mention', 'POST', '{"Content-type":"application/json"}', '{}', '5000');

CREATE TRIGGER update_mentions_updated_at BEFORE UPDATE ON public.mentions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER source_preferences_set_updated_at BEFORE UPDATE ON public.source_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


