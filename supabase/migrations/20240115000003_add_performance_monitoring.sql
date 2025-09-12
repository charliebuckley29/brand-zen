-- Migration: Add Performance Monitoring and Analytics
-- Description: Implements comprehensive performance monitoring for production scaling
-- Priority: HIGH - Essential for production monitoring

-- ========================================
-- PERFORMANCE METRICS TABLE
-- ========================================

-- Create performance metrics table for monitoring query performance
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    rows_affected INTEGER,
    user_id UUID,
    query_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance metrics queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_table_operation 
ON performance_metrics(table_name, operation, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_execution_time 
ON performance_metrics(execution_time_ms DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id 
ON performance_metrics(user_id, created_at DESC);

-- ========================================
-- PERFORMANCE MONITORING FUNCTIONS
-- ========================================

-- Function to log performance metrics
CREATE OR REPLACE FUNCTION log_performance_metric(
    p_table_name TEXT,
    p_operation TEXT,
    p_execution_time_ms INTEGER,
    p_rows_affected INTEGER DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_query_hash TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO performance_metrics (
        table_name, operation, execution_time_ms, 
        rows_affected, user_id, query_hash
    ) VALUES (
        p_table_name, p_operation, p_execution_time_ms,
        p_rows_affected, p_user_id, p_query_hash
    );
    
    -- Clean up old metrics (keep only last 30 days)
    DELETE FROM performance_metrics 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get performance summary
CREATE OR REPLACE FUNCTION get_performance_summary(
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    table_name TEXT,
    operation TEXT,
    avg_execution_time_ms NUMERIC,
    max_execution_time_ms INTEGER,
    total_operations BIGINT,
    slow_operations BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.table_name,
        pm.operation,
        ROUND(AVG(pm.execution_time_ms), 2) as avg_execution_time_ms,
        MAX(pm.execution_time_ms) as max_execution_time_ms,
        COUNT(*) as total_operations,
        COUNT(*) FILTER (WHERE pm.execution_time_ms > 1000) as slow_operations
    FROM performance_metrics pm
    WHERE pm.created_at >= NOW() - INTERVAL '1 hour' * p_hours
    GROUP BY pm.table_name, pm.operation
    ORDER BY avg_execution_time_ms DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- SLOW QUERY MONITORING
-- ========================================

-- Create view for slow queries (placeholder - requires pg_stat_statements extension)
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    'pg_stat_statements not available' as query,
    0 as calls,
    0 as total_time,
    0 as mean_time,
    0 as rows,
    0 as shared_blks_hit,
    0 as shared_blks_read,
    0 as local_blks_hit,
    0 as local_blks_read
WHERE false; -- This view will return no rows until pg_stat_statements is enabled

-- ========================================
-- DATABASE SIZE MONITORING
-- ========================================

-- Create view for table sizes
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_relation_size(schemaname||'.'||tablename) as table_size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ========================================
-- INDEX USAGE MONITORING
-- ========================================

-- Create view for index usage statistics
CREATE OR REPLACE VIEW index_usage_stats AS
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

-- ========================================
-- USER ACTIVITY MONITORING
-- ========================================

-- Create view for user activity
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    p.user_id,
    p.full_name,
    COUNT(DISTINCT m.id) as total_mentions,
    COUNT(DISTINCT n.id) as total_notifications,
    COUNT(DISTINCT k.id) as total_keywords,
    MAX(m.created_at) as last_mention_activity,
    MAX(n.created_at) as last_notification_activity,
    p.created_at as user_created_at
FROM profiles p
LEFT JOIN mentions m ON p.user_id = m.user_id
LEFT JOIN notifications n ON p.user_id = n.user_id
LEFT JOIN keywords k ON p.user_id = k.user_id
GROUP BY p.user_id, p.full_name, p.created_at
ORDER BY total_mentions DESC;

-- ========================================
-- API USAGE ANALYTICS
-- ========================================

-- Create view for API usage analytics
CREATE OR REPLACE VIEW api_usage_analytics AS
SELECT 
    api_source,
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE response_status >= 200 AND response_status < 300) as successful_calls,
    COUNT(*) FILTER (WHERE response_status >= 400) as error_calls,
    ROUND(AVG(calls_count), 2) as avg_calls_per_request,
    COUNT(DISTINCT user_id) as unique_users
FROM api_usage_tracking
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY api_source, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC, total_calls DESC;

-- ========================================
-- MENTION ANALYTICS VIEW
-- ========================================

-- Create materialized view for mention analytics (refreshed periodically)
CREATE MATERIALIZED VIEW mention_analytics AS
SELECT 
    user_id,
    DATE_TRUNC('day', published_at) as date,
    source_type,
    COUNT(*) as mention_count,
    ROUND(AVG(sentiment), 2) as avg_sentiment,
    COUNT(*) FILTER (WHERE sentiment IS NOT NULL) as sentiment_analyzed_count,
    COUNT(*) FILTER (WHERE flagged = true) as flagged_count,
    COUNT(*) FILTER (WHERE escalation_type IS NOT NULL) as escalated_count
FROM mentions
WHERE published_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, DATE_TRUNC('day', published_at), source_type;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_mention_analytics_user_date 
ON mention_analytics(user_id, date DESC);

-- Function to refresh mention analytics
CREATE OR REPLACE FUNCTION refresh_mention_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mention_analytics;
    
    -- Log the refresh
    INSERT INTO automation_logs (event_type, message, data)
    VALUES (
        'analytics_refresh',
        'Mention analytics materialized view refreshed',
        json_build_object(
            'refresh_time', NOW(),
            'view_name', 'mention_analytics'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ALERTING FUNCTIONS
-- ========================================

-- Function to check for performance issues
CREATE OR REPLACE FUNCTION check_performance_alerts()
RETURNS TABLE (
    alert_type TEXT,
    message TEXT,
    severity TEXT,
    details JSONB
) AS $$
BEGIN
    -- Check for slow queries (placeholder - requires pg_stat_statements extension)
    -- This will return no rows until pg_stat_statements is enabled
    RETURN QUERY
    SELECT 
        'slow_query'::TEXT as alert_type,
        'Slow query monitoring not available (pg_stat_statements extension required)' as message,
        'info'::TEXT as severity,
        json_build_object(
            'note', 'pg_stat_statements extension not available',
            'status', 'disabled'
        ) as details
    WHERE false; -- This will return no rows
    
    -- Check for high error rates
    RETURN QUERY
    SELECT 
        'high_error_rate'::TEXT as alert_type,
        'High error rate detected for API source: ' || api_source as message,
        'high'::TEXT as severity,
        json_build_object(
            'api_source', api_source,
            'error_rate', ROUND(error_rate, 2),
            'total_calls', total_calls,
            'error_calls', error_calls
        ) as details
    FROM (
        SELECT 
            api_source,
            COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE response_status >= 400) as error_calls,
            ROUND(
                COUNT(*) FILTER (WHERE response_status >= 400)::NUMERIC / COUNT(*) * 100, 
                2
            ) as error_rate
        FROM api_usage_tracking
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        GROUP BY api_source
    ) error_stats
    WHERE error_rate > 10 -- More than 10% error rate
    ORDER BY error_rate DESC;
    
    -- Check for database size growth
    RETURN QUERY
    SELECT 
        'large_table'::TEXT as alert_type,
        'Large table detected: ' || tablename as message,
        CASE 
            WHEN size_bytes > 1073741824 THEN 'high'::TEXT -- > 1GB
            ELSE 'medium'::TEXT
        END as severity,
        json_build_object(
            'table_name', tablename,
            'size', size,
            'size_bytes', size_bytes
        ) as details
    FROM table_sizes
    WHERE size_bytes > 536870912 -- > 512MB
    ORDER BY size_bytes DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- CLEANUP FUNCTIONS
-- ========================================

-- Function to clean up old performance metrics
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS void AS $$
BEGIN
    -- Delete performance metrics older than 30 days
    DELETE FROM performance_metrics 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Delete old automation logs (keep 90 days)
    DELETE FROM automation_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Log cleanup
    INSERT INTO automation_logs (event_type, message, data)
    VALUES (
        'cleanup_completed',
        'Old metrics and logs cleaned up',
        json_build_object(
            'cleanup_time', NOW(),
            'metrics_retention_days', 30,
            'logs_retention_days', 90
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- MONITORING DASHBOARD VIEWS
-- ========================================

-- Create comprehensive monitoring dashboard view
CREATE OR REPLACE VIEW monitoring_dashboard AS
SELECT 
    'database_performance' as category,
    json_build_object(
        'total_queries', 0, -- pg_stat_statements not available
        'slow_queries', 0, -- pg_stat_statements not available
        'avg_query_time', 0, -- pg_stat_statements not available
        'total_connections', (SELECT COUNT(*) FROM pg_stat_activity),
        'active_connections', (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active'),
        'note', 'Query performance monitoring requires pg_stat_statements extension'
    ) as metrics
UNION ALL
SELECT 
    'table_sizes' as category,
    json_build_object(
        'total_tables', (SELECT COUNT(*) FROM table_sizes),
        'largest_table', (SELECT tablename FROM table_sizes ORDER BY size_bytes DESC LIMIT 1),
        'total_size', (SELECT pg_size_pretty(SUM(size_bytes)) FROM table_sizes)
    ) as metrics
UNION ALL
SELECT 
    'user_activity' as category,
    json_build_object(
        'total_users', (SELECT COUNT(*) FROM profiles),
        'active_users_24h', (SELECT COUNT(DISTINCT user_id) FROM mentions WHERE created_at >= NOW() - INTERVAL '24 hours'),
        'total_mentions', (SELECT COUNT(*) FROM mentions),
        'mentions_24h', (SELECT COUNT(*) FROM mentions WHERE created_at >= NOW() - INTERVAL '24 hours')
    ) as metrics
UNION ALL
SELECT 
    'api_usage' as category,
    json_build_object(
        'total_api_calls_24h', (SELECT COUNT(*) FROM api_usage_tracking WHERE created_at >= NOW() - INTERVAL '24 hours'),
        'error_rate_24h', (
            SELECT ROUND(
                COUNT(*) FILTER (WHERE response_status >= 400)::NUMERIC / COUNT(*) * 100, 
                2
            )
            FROM api_usage_tracking 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
        ),
        'unique_users_24h', (SELECT COUNT(DISTINCT user_id) FROM api_usage_tracking WHERE created_at >= NOW() - INTERVAL '24 hours')
    ) as metrics;

-- ========================================
-- VERIFICATION
-- ========================================

-- Log the completion of this migration
INSERT INTO automation_logs (event_type, message, data)
VALUES (
    'migration_completed',
    'Performance monitoring migration completed successfully',
    json_build_object(
        'migration_name', 'add_performance_monitoring',
        'tables_created', ARRAY[
            'performance_metrics'
        ],
        'views_created', ARRAY[
            'slow_queries', 'table_sizes', 'index_usage_stats',
            'user_activity_summary', 'api_usage_analytics',
            'monitoring_dashboard'
        ],
        'materialized_views_created', ARRAY[
            'mention_analytics'
        ],
        'functions_created', ARRAY[
            'log_performance_metric', 'get_performance_summary',
            'refresh_mention_analytics', 'check_performance_alerts',
            'cleanup_old_metrics'
        ],
        'completion_time', NOW()
    )
);

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify all monitoring components were created
DO $$
DECLARE
    table_count INTEGER;
    view_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Check performance_metrics table
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'performance_metrics';
    
    IF table_count = 0 THEN
        RAISE EXCEPTION 'performance_metrics table not created';
    END IF;
    
    -- Check views
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name IN ('slow_queries', 'table_sizes', 'monitoring_dashboard');
    
    IF view_count < 3 THEN
        RAISE EXCEPTION 'Expected at least 3 monitoring views, found %', view_count;
    END IF;
    
    -- Check functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('log_performance_metric', 'check_performance_alerts');
    
    IF function_count < 2 THEN
        RAISE EXCEPTION 'Expected at least 2 monitoring functions, found %', function_count;
    END IF;
    
    RAISE NOTICE 'Successfully created performance monitoring system';
    RAISE NOTICE 'Tables: %, Views: %, Functions: %', table_count, view_count, function_count;
END $$;
