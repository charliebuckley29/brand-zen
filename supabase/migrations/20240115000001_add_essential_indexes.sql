-- Migration: Add Essential Indexes for Production Scaling
-- Description: Adds critical database indexes to support thousands of users
-- Priority: CRITICAL - Must be applied before production scaling

-- ========================================
-- MENTIONS TABLE INDEXES
-- ========================================

-- Most critical: User mentions by creation date (for dashboard queries)
CREATE INDEX IF NOT EXISTS idx_mentions_user_id_created_at 
ON mentions(user_id, created_at DESC);

-- User mentions by publication date (for chronological ordering)
CREATE INDEX IF NOT EXISTS idx_mentions_user_id_published_at 
ON mentions(user_id, published_at DESC);

-- Sentiment analysis queries (filtered index for better performance)
CREATE INDEX IF NOT EXISTS idx_mentions_sentiment 
ON mentions(sentiment) WHERE sentiment IS NOT NULL;

-- Flagged mentions queries (filtered index for better performance)
CREATE INDEX IF NOT EXISTS idx_mentions_flagged 
ON mentions(flagged) WHERE flagged = true;

-- Source type filtering
CREATE INDEX IF NOT EXISTS idx_mentions_source_type 
ON mentions(source_type);

-- Keyword relationship (for mention-keyword joins)
CREATE INDEX IF NOT EXISTS idx_mentions_keyword_id 
ON mentions(keyword_id);

-- Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_mentions_user_source_sentiment 
ON mentions(user_id, source_type, sentiment) 
WHERE sentiment IS NOT NULL;

-- Composite index for flagged mentions dashboard
CREATE INDEX IF NOT EXISTS idx_mentions_user_flagged_created 
ON mentions(user_id, flagged, created_at DESC) 
WHERE flagged = true;

-- ========================================
-- NOTIFICATIONS TABLE INDEXES
-- ========================================

-- User notifications by read status (for notification center)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read 
ON notifications(user_id, read);

-- User notifications by creation date (for chronological ordering)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at 
ON notifications(user_id, created_at DESC);

-- Unread notifications count (for badge display)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread 
ON notifications(user_id, created_at DESC) 
WHERE read = false;

-- ========================================
-- API USAGE TRACKING INDEXES
-- ========================================

-- User API usage by date (for rate limiting and analytics)
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id_created_at 
ON api_usage_tracking(user_id, created_at DESC);

-- API source usage tracking
CREATE INDEX IF NOT EXISTS idx_api_usage_source_created_at 
ON api_usage_tracking(api_source, created_at DESC);

-- Response status monitoring
CREATE INDEX IF NOT EXISTS idx_api_usage_response_status 
ON api_usage_tracking(response_status) 
WHERE response_status IS NOT NULL;

-- ========================================
-- USER FETCH HISTORY INDEXES
-- ========================================

-- User fetch operations by date
CREATE INDEX IF NOT EXISTS idx_user_fetch_history_user_id 
ON user_fetch_history(user_id, created_at DESC);

-- Fetch type analysis
CREATE INDEX IF NOT EXISTS idx_user_fetch_history_type 
ON user_fetch_history(fetch_type, created_at DESC);

-- ========================================
-- KEYWORDS TABLE INDEXES
-- ========================================

-- User keywords lookup
CREATE INDEX IF NOT EXISTS idx_keywords_user_id 
ON keywords(user_id, created_at DESC);

-- Active keywords only
CREATE INDEX IF NOT EXISTS idx_keywords_user_id_active 
ON keywords(user_id, created_at DESC) 
WHERE google_alerts_enabled = true;

-- ========================================
-- PROFILES TABLE INDEXES
-- ========================================

-- User profile lookup by user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles(user_id);

-- Automation enabled users
CREATE INDEX IF NOT EXISTS idx_profiles_automation_enabled 
ON profiles(user_id) 
WHERE automation_enabled = true;

-- ========================================
-- USER ROLES TABLE INDEXES
-- ========================================

-- User role lookup
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
ON user_roles(user_id);

-- Role-based queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_type 
ON user_roles(user_type);

-- ========================================
-- SOURCE PREFERENCES INDEXES
-- ========================================

-- User source preferences
CREATE INDEX IF NOT EXISTS idx_source_preferences_user_id 
ON source_preferences(user_id, source_type);

-- ========================================
-- REPORTS TABLE INDEXES
-- ========================================

-- User reports by month
CREATE INDEX IF NOT EXISTS idx_reports_user_id_month 
ON reports(user_id, report_month DESC);

-- ========================================
-- MENTION EXCLUSIONS INDEXES
-- ========================================

-- User exclusions by keyword
CREATE INDEX IF NOT EXISTS idx_mention_exclusions_user_keyword 
ON mention_exclusions(user_id, keyword_id);

-- ========================================
-- BUG REPORTS INDEXES
-- ========================================

-- User bug reports
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id 
ON bug_reports(user_id, created_at DESC);

-- Bug report status
CREATE INDEX IF NOT EXISTS idx_bug_reports_status 
ON bug_reports(status, created_at DESC);

-- ========================================
-- PERFORMANCE MONITORING
-- ========================================

-- Log the completion of this migration
INSERT INTO automation_logs (event_type, message, data)
VALUES (
    'migration_completed',
    'Essential indexes migration completed successfully',
    json_build_object(
        'migration_name', 'add_essential_indexes',
        'tables_affected', ARRAY[
            'mentions', 'notifications', 'api_usage_tracking',
            'user_fetch_history', 'keywords', 'profiles',
            'user_roles', 'source_preferences', 'reports',
            'mention_exclusions', 'bug_reports'
        ],
        'indexes_created', 20,
        'completion_time', NOW()
    )
);

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify indexes were created successfully
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%';
    
    IF index_count < 20 THEN
        RAISE EXCEPTION 'Expected at least 20 indexes, found %', index_count;
    END IF;
    
    RAISE NOTICE 'Successfully created % indexes', index_count;
END $$;
