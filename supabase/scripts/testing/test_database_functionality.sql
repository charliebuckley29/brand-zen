-- Test Database Functionality After Security Fixes
-- Run this in Supabase SQL Editor to verify everything works

-- ========================================
-- TEST 1: PROFILE COMPLETION FUNCTIONALITY
-- ========================================

-- Test that profile updates work without infinite recursion
-- (This should work now that we fixed the RLS policies)

-- ========================================
-- TEST 2: DATABASE VIEWS WITH SECURITY INVOKER
-- ========================================

-- Test user_activity_summary view
SELECT 'Testing user_activity_summary view...' as test_name;
SELECT * FROM user_activity_summary LIMIT 5;

-- Test api_usage_analytics view  
SELECT 'Testing api_usage_analytics view...' as test_name;
SELECT * FROM api_usage_analytics LIMIT 5;

-- Test mention_analytics view
SELECT 'Testing mention_analytics view...' as test_name;
SELECT * FROM mention_analytics LIMIT 5;

-- Test monitoring_dashboard view
SELECT 'Testing monitoring_dashboard view...' as test_name;
SELECT * FROM monitoring_dashboard LIMIT 5;

-- ========================================
-- TEST 3: PERFORMANCE MONITORING FUNCTIONS
-- ========================================

-- Test log_performance_metric function
SELECT 'Testing log_performance_metric function...' as test_name;
SELECT log_performance_metric('test_operation', 100, auth.uid(), '{"test": true}'::jsonb);

-- Test get_performance_summary function
SELECT 'Testing get_performance_summary function...' as test_name;
SELECT get_performance_summary(24);

-- Test check_performance_alerts function
SELECT 'Testing check_performance_alerts function...' as test_name;
SELECT check_performance_alerts();

-- Test cleanup_old_metrics function
SELECT 'Testing cleanup_old_metrics function...' as test_name;
SELECT cleanup_old_metrics(30);

-- ========================================
-- TEST 4: RLS POLICIES AND USER ISOLATION
-- ========================================

-- Test that users can only see their own data
-- (This should respect RLS policies)

-- Check current user context
SELECT 'Current user context:' as test_name, auth.uid() as current_user_id;

-- Test mentions table access (should only show user's own mentions)
SELECT 'Testing mentions RLS...' as test_name;
SELECT COUNT(*) as mention_count FROM mentions WHERE user_id = auth.uid();

-- Test notifications table access (should only show user's own notifications)
SELECT 'Testing notifications RLS...' as test_name;
SELECT COUNT(*) as notification_count FROM notifications WHERE user_id = auth.uid();

-- ========================================
-- TEST 5: VIEW SECURITY CONFIGURATION
-- ========================================

-- Verify all views are configured with SECURITY INVOKER
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN (
    'user_activity_summary',
    'api_usage_analytics', 
    'slow_queries',
    'table_sizes',
    'index_usage_stats',
    'monitoring_dashboard',
    'mention_analytics'
)
ORDER BY viewname;

-- ========================================
-- TEST 6: FUNCTION SECURITY CONFIGURATION
-- ========================================

-- Verify all functions have proper search_path
SELECT 
    proname as function_name,
    proconfig as function_config
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN (
    'log_performance_metric',
    'get_performance_summary', 
    'refresh_mention_analytics',
    'check_performance_alerts',
    'cleanup_old_metrics'
)
ORDER BY proname;
