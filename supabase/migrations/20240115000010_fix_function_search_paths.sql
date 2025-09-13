-- Migration: Fix Function Search Paths
-- Description: Fixes remaining function search path warnings
-- Priority: HIGH - Security compliance

-- ========================================
-- FIX FUNCTION SEARCH PATHS
-- ========================================

-- Drop and recreate log_performance_metric function with proper search_path
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

-- Ensure all other functions have proper search_path
-- (These should already be fixed from previous migrations, but let's ensure they're correct)

-- Fix get_performance_summary function
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

-- Fix refresh_mention_analytics function
DROP FUNCTION IF EXISTS public.refresh_mention_analytics();
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

-- Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION public.log_performance_metric(text, integer, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_performance_summary(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_mention_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_performance_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_metrics(integer) TO authenticated;
