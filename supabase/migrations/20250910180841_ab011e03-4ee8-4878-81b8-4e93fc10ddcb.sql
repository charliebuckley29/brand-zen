-- Clean up duplicate cron jobs, keep only the automated-scheduler
SELECT cron.unschedule('automated-mention-fetch');
SELECT cron.unschedule('fetch-mentions-frequency-check'); 
SELECT cron.unschedule('invoke-aggregate-sources-hourly');
SELECT cron.unschedule('invoke-monitor-news-hourly');
SELECT cron.unschedule('monitor-news-hourly');