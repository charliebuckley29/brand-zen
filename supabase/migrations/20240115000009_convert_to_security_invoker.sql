-- Migration: Convert Views to SECURITY INVOKER
-- Description: Converts all views to use caller's permissions instead of definer's
-- Priority: HIGH - Security compliance and proper RLS enforcement

-- ========================================
-- CONVERT TO SECURITY INVOKER
-- ========================================

-- Drop all views and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.monitoring_dashboard CASCADE;
DROP VIEW IF EXISTS public.table_sizes CASCADE;
DROP VIEW IF EXISTS public.index_usage_stats CASCADE;
DROP VIEW IF EXISTS public.slow_queries CASCADE;
DROP VIEW IF EXISTS public.api_usage_analytics CASCADE;
DROP VIEW IF EXISTS public.user_activity_summary CASCADE;
DROP VIEW IF EXISTS public.mention_analytics CASCADE;

-- Recreate all views with SECURITY INVOKER
-- This ensures views respect the caller's RLS policies and permissions

-- User activity summary view
CREATE VIEW public.user_activity_summary 
WITH (security_invoker=on) AS
SELECT 
    user_id,
    COUNT(*) as total_activities,
    MAX(created_at) as last_activity,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as activities_24h,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as activities_7d
FROM (
    SELECT user_id, created_at FROM mentions
    UNION ALL
    SELECT user_id, created_at FROM notifications
    UNION ALL
    SELECT user_id, created_at FROM reports
) activities
GROUP BY user_id;

-- API usage analytics view
CREATE VIEW public.api_usage_analytics 
WITH (security_invoker=on) AS
SELECT 
    api_source,
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN response_status >= 400 THEN 1 END) as error_calls,
    COUNT(CASE WHEN response_status >= 200 AND response_status < 300 THEN 1 END) as successful_calls,
    ROUND(AVG(calls_count), 2) as avg_calls_per_request,
    COUNT(DISTINCT user_id) as unique_users
FROM api_usage_tracking
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY api_source, DATE_TRUNC('day', created_at)
ORDER BY date DESC, total_calls DESC;

-- Slow queries view (placeholder)
CREATE VIEW public.slow_queries 
WITH (security_invoker=on) AS
SELECT 
    'No slow query data available' as query,
    0 as calls,
    0 as total_time,
    0 as mean_time,
    0 as rows,
    0 as shared_blks_hit,
    0 as shared_blks_read,
    0 as local_blks_hit,
    0 as local_blks_read
WHERE false;

-- Table sizes view
CREATE VIEW public.table_sizes 
WITH (security_invoker=on) AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage stats view
CREATE VIEW public.index_usage_stats 
WITH (security_invoker=on) AS
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Monitoring dashboard view
CREATE VIEW public.monitoring_dashboard 
WITH (security_invoker=on) AS
SELECT 
    'system_health' as metric_type,
    json_build_object(
        'total_connections', (SELECT COUNT(*) FROM pg_stat_activity),
        'active_connections', (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active'),
        'database_size', pg_size_pretty(pg_database_size(current_database())),
        'last_vacuum', (SELECT MAX(last_vacuum) FROM pg_stat_user_tables),
        'last_analyze', (SELECT MAX(last_analyze) FROM pg_stat_user_tables)
    ) as metrics
UNION ALL
SELECT 
    'api_usage' as metric_type,
    json_build_object(
        'total_api_calls', (SELECT COUNT(*) FROM api_usage_tracking WHERE created_at >= NOW() - INTERVAL '1 hour'),
        'error_rate', (SELECT COUNT(*) FILTER (WHERE response_status >= 400)::float / NULLIF(COUNT(*), 0) FROM api_usage_tracking WHERE created_at >= NOW() - INTERVAL '1 hour'),
        'unique_users', (SELECT COUNT(DISTINCT user_id) FROM api_usage_tracking WHERE created_at >= NOW() - INTERVAL '1 hour')
    ) as metrics;

-- Mention analytics view
CREATE VIEW public.mention_analytics 
WITH (security_invoker=on) AS
SELECT 
    user_id,
    DATE_TRUNC('day', published_at) as date,
    COUNT(*) as total_mentions,
    COUNT(CASE WHEN sentiment > 50 THEN 1 END) as positive_mentions,
    COUNT(CASE WHEN sentiment < 50 AND sentiment >= 0 THEN 1 END) as negative_mentions,
    COUNT(CASE WHEN sentiment = 50 THEN 1 END) as neutral_mentions,
    COUNT(CASE WHEN flagged = true THEN 1 END) as flagged_mentions,
    AVG(CASE WHEN sentiment IS NOT NULL AND sentiment >= 0 THEN sentiment END) as avg_sentiment_score
FROM mentions
WHERE published_at >= NOW() - INTERVAL '90 days'
GROUP BY user_id, DATE_TRUNC('day', published_at)
ORDER BY date DESC;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant select permissions on all views to authenticated users
GRANT SELECT ON public.user_activity_summary TO authenticated;
GRANT SELECT ON public.api_usage_analytics TO authenticated;
GRANT SELECT ON public.slow_queries TO authenticated;
GRANT SELECT ON public.table_sizes TO authenticated;
GRANT SELECT ON public.index_usage_stats TO authenticated;
GRANT SELECT ON public.monitoring_dashboard TO authenticated;
GRANT SELECT ON public.mention_analytics TO authenticated;

-- ========================================
-- ADDITIONAL RLS POLICIES FOR VIEWS
-- ========================================

-- Ensure users can only see their own data in analytics views
-- (These will be enforced by the underlying table RLS policies)

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own mention analytics" ON public.mentions;
DROP POLICY IF EXISTS "Users can view own activity summary" ON public.mentions;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;

-- Add explicit policy for mention_analytics to ensure user isolation
CREATE POLICY "Users can view own mention analytics" ON public.mentions
FOR SELECT USING (auth.uid() = user_id);

-- Add policy for user_activity_summary
CREATE POLICY "Users can view own activity summary" ON public.mentions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own reports" ON public.reports
FOR SELECT USING (auth.uid() = user_id);
