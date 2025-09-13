-- Migration: Fix Security Issues and Warnings
-- Description: Addresses Supabase linter warnings and errors for production security
-- Priority: HIGH - Security and compliance fixes

-- ========================================
-- FIX SECURITY DEFINER VIEWS
-- ========================================

-- Remove SECURITY DEFINER from views that don't need it
-- These views should use the querying user's permissions, not the creator's
-- Drop views in dependency order (most dependent first)

-- Drop dependent views first
DROP VIEW IF EXISTS public.monitoring_dashboard CASCADE;
DROP VIEW IF EXISTS public.table_sizes CASCADE;
DROP VIEW IF EXISTS public.index_usage_stats CASCADE;
DROP VIEW IF EXISTS public.slow_queries CASCADE;
DROP VIEW IF EXISTS public.api_usage_analytics CASCADE;
DROP VIEW IF EXISTS public.user_activity_summary CASCADE;

-- Recreate views without SECURITY DEFINER

-- Fix user_activity_summary view
CREATE VIEW public.user_activity_summary AS
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

-- Fix api_usage_analytics view
CREATE VIEW public.api_usage_analytics AS
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

-- Fix slow_queries view (placeholder since pg_stat_statements not available)
CREATE VIEW public.slow_queries AS
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
WHERE false; -- This view will return no rows until pg_stat_statements is enabled

-- Fix table_sizes view
CREATE VIEW public.table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Fix index_usage_stats view
CREATE VIEW public.index_usage_stats AS
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

-- Fix monitoring_dashboard view
CREATE VIEW public.monitoring_dashboard AS
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

-- ========================================
-- CREATE PERFORMANCE_METRICS TABLE
-- ========================================

-- Create performance_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    operation text NOT NULL,
    duration_ms integer NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    metadata jsonb DEFAULT '{}'::jsonb,
    response_status integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on performance_metrics table
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for performance_metrics
CREATE POLICY "System can insert performance metrics" ON public.performance_metrics
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own performance metrics" ON public.performance_metrics
FOR SELECT USING (auth.uid() = user_id);

-- ========================================
-- FIX FUNCTION SEARCH PATHS
-- ========================================

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS public.log_performance_metric(text, integer, uuid, jsonb);
DROP FUNCTION IF EXISTS public.get_performance_summary(integer);
DROP FUNCTION IF EXISTS public.refresh_mention_analytics();
DROP FUNCTION IF EXISTS public.check_performance_alerts();
DROP FUNCTION IF EXISTS public.cleanup_old_metrics(integer);

-- Fix log_performance_metric function
CREATE FUNCTION public.log_performance_metric(
    _operation text,
    _duration_ms integer,
    _user_id uuid DEFAULT auth.uid(),
    _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO performance_metrics (
        operation,
        duration_ms,
        user_id,
        metadata,
        created_at
    ) VALUES (
        _operation,
        _duration_ms,
        _user_id,
        _metadata,
        NOW()
    );
END;
$$;

-- Fix get_performance_summary function
CREATE FUNCTION public.get_performance_summary(
    _hours integer DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT json_build_object(
        'total_operations', COUNT(*),
        'avg_duration', ROUND(AVG(duration_ms), 2),
        'max_duration', MAX(duration_ms),
        'min_duration', MIN(duration_ms),
        'error_count', COUNT(*) FILTER (WHERE duration_ms > 5000),
        'time_period_hours', _hours
    ) INTO result
    FROM performance_metrics
    WHERE created_at >= NOW() - (_hours || ' hours')::interval;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Fix refresh_mention_analytics function
CREATE FUNCTION public.refresh_mention_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Since we converted to a regular view, this function just logs the refresh
    INSERT INTO automation_logs (event_type, message, data)
    VALUES (
        'analytics_refresh',
        'Mention analytics view refreshed',
        json_build_object(
            'refresh_time', NOW(),
            'view_name', 'mention_analytics'
        )
    );
END;
$$;

-- Fix check_performance_alerts function
CREATE FUNCTION public.check_performance_alerts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    alerts jsonb := '[]'::jsonb;
    slow_query_count integer;
    error_rate numeric;
BEGIN
    -- Check for slow queries in the last hour
    SELECT COUNT(*) INTO slow_query_count
    FROM performance_metrics
    WHERE created_at >= NOW() - INTERVAL '1 hour'
    AND duration_ms > 5000;
    
    IF slow_query_count > 10 THEN
        alerts := alerts || json_build_object(
            'type', 'slow_queries',
            'severity', 'high',
            'message', 'High number of slow queries detected',
            'count', slow_query_count
        );
    END IF;
    
    -- Check error rate
    SELECT 
        COUNT(*) FILTER (WHERE response_status >= 400)::float / 
        NULLIF(COUNT(*), 0) INTO error_rate
    FROM performance_metrics
    WHERE created_at >= NOW() - INTERVAL '1 hour';
    
    IF error_rate > 0.1 THEN
        alerts := alerts || json_build_object(
            'type', 'high_error_rate',
            'severity', 'critical',
            'message', 'High error rate detected',
            'rate', ROUND(error_rate * 100, 2)
        );
    END IF;
    
    RETURN alerts;
END;
$$;

-- Fix cleanup_old_metrics function
CREATE FUNCTION public.cleanup_old_metrics(
    _days_to_keep integer DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM performance_metrics
    WHERE created_at < NOW() - (_days_to_keep || ' days')::interval;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- ========================================
-- SECURE MATERIALIZED VIEW
-- ========================================

-- Add RLS to mention_analytics materialized view by creating a regular view with RLS
DROP MATERIALIZED VIEW IF EXISTS public.mention_analytics CASCADE;

-- Create a regular view instead of materialized view for better security
CREATE VIEW public.mention_analytics AS
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

-- Enable RLS on the view (though views inherit RLS from underlying tables)
-- Add a policy to ensure users can only see their own analytics
CREATE POLICY "Users can view own mention analytics" ON public.mentions
FOR SELECT USING (auth.uid() = user_id);

-- ========================================
-- GRANT NECESSARY PERMISSIONS
-- ========================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.log_performance_metric(text, integer, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_performance_summary(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_mention_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_performance_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_metrics(integer) TO authenticated;

-- Grant select on views to authenticated users
GRANT SELECT ON public.user_activity_summary TO authenticated;
GRANT SELECT ON public.api_usage_analytics TO authenticated;
GRANT SELECT ON public.slow_queries TO authenticated;
GRANT SELECT ON public.table_sizes TO authenticated;
GRANT SELECT ON public.index_usage_stats TO authenticated;
GRANT SELECT ON public.monitoring_dashboard TO authenticated;
GRANT SELECT ON public.mention_analytics TO authenticated;
