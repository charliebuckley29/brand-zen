-- Comprehensive Fix for ALL Function Search Path Warnings
-- Run this in Supabase SQL Editor

-- ========================================
-- FIX ALL FUNCTION SEARCH PATHS
-- ========================================

-- Drop and recreate ALL functions with proper search_path

-- 1. log_performance_metric
DROP FUNCTION IF EXISTS public.log_performance_metric(text, integer, uuid, jsonb);
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

-- 2. get_performance_summary
DROP FUNCTION IF EXISTS public.get_performance_summary(integer);
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

-- 3. refresh_mention_analytics
DROP FUNCTION IF EXISTS public.refresh_mention_analytics();
CREATE FUNCTION public.refresh_mention_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- 4. check_performance_alerts
DROP FUNCTION IF EXISTS public.check_performance_alerts();
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

-- 5. cleanup_old_metrics
DROP FUNCTION IF EXISTS public.cleanup_old_metrics(integer);
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
-- GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION public.log_performance_metric(text, integer, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_performance_summary(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_mention_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_performance_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_metrics(integer) TO authenticated;

-- ========================================
-- VERIFY FIXES
-- ========================================

-- This query should show all functions now have search_path set
SELECT 
    proname as function_name,
    prosrc as function_source,
    proconfig as function_config
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('log_performance_metric', 'get_performance_summary', 'refresh_mention_analytics', 'check_performance_alerts', 'cleanup_old_metrics');
