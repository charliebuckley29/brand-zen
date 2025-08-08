-- Enable required extensions for scheduling (safe if already enabled)
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Ensure URL-level deduplication per user
do $$ begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'uniq_mentions_user_url'
  ) then
    create unique index uniq_mentions_user_url on public.mentions (user_id, source_url);
  end if;
end $$;

-- Unschedule existing job if present
do $$ begin
  perform cron.unschedule('monitor-news-hourly');
exception when others then
  -- ignore if job doesn't exist
  null;
end $$;

-- Schedule hourly job to fetch mentions
select
  cron.schedule(
    'monitor-news-hourly',
    '5 * * * *', -- at minute 5 every hour
    $$
    select net.http_post(
      url := 'https://sjypzdqelypxymzzxhxi.supabase.co/functions/v1/monitor-news',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
    $$
  );