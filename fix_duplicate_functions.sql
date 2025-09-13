-- Fix Duplicate Functions and Missing Search Path
-- Run this in Supabase SQL Editor

-- ========================================
-- CLEAN UP DUPLICATE FUNCTIONS
-- ========================================

-- Drop ALL versions of functions to clean up duplicates
DROP FUNCTION IF EXISTS public.log_performance_metric(text, integer, uuid, jsonb);
DROP FUNCTION IF EXISTS public.log_performance_metric(text, text, integer, integer, uuid, text);
DROP FUNCTION IF EXISTS public.cleanup_old_metrics();
DROP FUNCTION IF EXISTS public.cleanup_old_metrics(integer);

-- ========================================
-- RECREATE FUNCTIONS WITH PROPER SEARCH_PATH
-- ========================================

-- 1. log_performance_metric (the version we want)
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

-- 2. cleanup_old_metrics (the version we want)
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
GRANT EXECUTE ON FUNCTION public.cleanup_old_metrics(integer) TO authenticated;

-- ========================================
-- VERIFY ALL FUNCTIONS HAVE SEARCH_PATH
-- ========================================

-- This should show all functions now have search_path set
SELECT 
    proname as function_name,
    proargnames as argument_names,
    proconfig as function_config
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('log_performance_metric', 'get_performance_summary', 'refresh_mention_analytics', 'check_performance_alerts', 'cleanup_old_metrics')
ORDER BY proname, proargnames;
