-- Schedule hourly aggregation and RSS news ingestion
select cron.schedule(
  'invoke-aggregate-sources-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url:='https://sjypzdqelypxymzzxhxi.supabase.co/functions/v1/aggregate-sources',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqeXB6ZHFlbHlweHltenp4aHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQ4NjQsImV4cCI6MjA3MDE2MDg2NH0.HkMy1dRyXSyiSOgpplZMGFWOoMbMXJ73kLWWCd_KcRQ"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

select cron.schedule(
  'invoke-monitor-news-hourly',
  '15 * * * *',
  $$
  select net.http_post(
    url:='https://sjypzdqelypxymzzxhxi.supabase.co/functions/v1/monitor-news',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqeXB6ZHFlbHlweHltenp4aHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQ4NjQsImV4cCI6MjA3MDE2MDg2NH0.HkMy1dRyXSyiSOgpplZMGFWOoMbMXJ73kLWWCd_KcRQ"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);