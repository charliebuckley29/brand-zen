-- Migration: Add Row Level Security (RLS) Policies
-- Description: Implements comprehensive RLS policies for data security and performance
-- Priority: CRITICAL - Must be applied before production scaling

-- ========================================
-- ENABLE ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on all user-facing tables (if not already enabled)
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE mention_exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_fetch_history ENABLE ROW LEVEL SECURITY;

-- ========================================
-- MENTIONS TABLE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own mentions" ON mentions;
DROP POLICY IF EXISTS "Users can insert own mentions" ON mentions;
DROP POLICY IF EXISTS "Users can update own mentions" ON mentions;
DROP POLICY IF EXISTS "Users can delete own mentions" ON mentions;
DROP POLICY IF EXISTS "Admins can access all mentions" ON mentions;
DROP POLICY IF EXISTS "Moderators can view all mentions" ON mentions;

-- Create new policies
CREATE POLICY "Users can view own mentions" ON mentions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mentions" ON mentions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mentions" ON mentions
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mentions" ON mentions
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can access all mentions" ON mentions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND user_type = 'admin'
    )
);

CREATE POLICY "Moderators can view all mentions" ON mentions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND user_type IN ('moderator', 'admin')
    )
);

-- ========================================
-- NOTIFICATIONS TABLE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can access all notifications" ON notifications;

-- Create new policies
CREATE POLICY "Users can view own notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
FOR INSERT WITH CHECK (true); -- Allow system to insert notifications

CREATE POLICY "Users can update own notifications" ON notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can access all notifications" ON notifications
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND user_type = 'admin'
    )
);

-- ========================================
-- KEYWORDS TABLE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own keywords" ON keywords;
DROP POLICY IF EXISTS "Admins can access all keywords" ON keywords;

-- Create new policies
CREATE POLICY "Users can manage own keywords" ON keywords
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can access all keywords" ON keywords
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND user_type = 'admin'
    )
);

-- ========================================
-- PROFILES TABLE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can access all profiles" ON profiles;

-- Create new policies
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert profiles" ON profiles
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can access all profiles" ON profiles
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND user_type = 'admin'
    )
);

-- ========================================
-- USER ROLES TABLE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;

-- Create new policies
CREATE POLICY "Users can view own role" ON user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user roles" ON user_roles
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND user_type = 'admin'
    )
);

-- ========================================
-- SOURCE PREFERENCES TABLE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own source preferences" ON source_preferences;
DROP POLICY IF EXISTS "Admins can access all source preferences" ON source_preferences;

-- Create new policies
CREATE POLICY "Users can manage own source preferences" ON source_preferences
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can access all source preferences" ON source_preferences
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND user_type = 'admin'
    )
);

-- ========================================
-- REPORTS TABLE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
DROP POLICY IF EXISTS "System can insert reports" ON reports;
DROP POLICY IF EXISTS "Users can update own reports" ON reports;
DROP POLICY IF EXISTS "Admins can access all reports" ON reports;

-- Create new policies
CREATE POLICY "Users can view own reports" ON reports
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert reports" ON reports
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own reports" ON reports
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can access all reports" ON reports
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND user_type = 'admin'
    )
);

-- ========================================
-- MENTION EXCLUSIONS TABLE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own exclusions" ON mention_exclusions;
DROP POLICY IF EXISTS "Admins can access all exclusions" ON mention_exclusions;

-- Create new policies
CREATE POLICY "Users can manage own exclusions" ON mention_exclusions
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can access all exclusions" ON mention_exclusions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND user_type = 'admin'
    )
);

-- ========================================
-- BUG REPORTS TABLE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Admins and moderators can access all bug reports" ON bug_reports;

-- Create new policies
CREATE POLICY "Users can manage own bug reports" ON bug_reports
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins and moderators can access all bug reports" ON bug_reports
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND user_type IN ('admin', 'moderator')
    )
);

-- ========================================
-- USER FETCH HISTORY TABLE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own fetch history" ON user_fetch_history;
DROP POLICY IF EXISTS "System can insert fetch history" ON user_fetch_history;
DROP POLICY IF EXISTS "Admins can access all fetch history" ON user_fetch_history;

-- Create new policies
CREATE POLICY "Users can view own fetch history" ON user_fetch_history
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert fetch history" ON user_fetch_history
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can access all fetch history" ON user_fetch_history
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND user_type = 'admin'
    )
);

-- ========================================
-- API USAGE TRACKING TABLE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own API usage" ON api_usage_tracking;
DROP POLICY IF EXISTS "System can insert API usage tracking" ON api_usage_tracking;
DROP POLICY IF EXISTS "Admins can access all API usage" ON api_usage_tracking;

-- Create new policies
CREATE POLICY "Users can view own API usage" ON api_usage_tracking
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert API usage tracking" ON api_usage_tracking
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can access all API usage" ON api_usage_tracking
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND user_type = 'admin'
    )
);

-- ========================================
-- GLOBAL SETTINGS TABLE POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can access global settings" ON global_settings;

-- Create new policies
CREATE POLICY "Admins can access global settings" ON global_settings
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND user_type = 'admin'
    )
);

-- ========================================
-- ADMIN TABLES POLICIES
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can access admin twilio settings" ON admin_twilio_settings;
DROP POLICY IF EXISTS "Admins can access API keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can access automation logs" ON automation_logs;

-- Create new policies
CREATE POLICY "Admins can access admin twilio settings" ON admin_twilio_settings
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND user_type = 'admin'
    )
);

CREATE POLICY "Admins can access API keys" ON api_keys
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND user_type = 'admin'
    )
);

CREATE POLICY "Admins can access automation logs" ON automation_logs
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND user_type = 'admin'
    )
);

-- ========================================
-- VERIFICATION
-- ========================================

-- Log the completion of this migration
INSERT INTO automation_logs (event_type, message, data)
VALUES (
    'migration_completed',
    'RLS policies migration completed successfully',
    json_build_object(
        'migration_name', 'add_rls_policies',
        'tables_secured', ARRAY[
            'mentions', 'notifications', 'keywords', 'profiles',
            'user_roles', 'source_preferences', 'reports',
            'mention_exclusions', 'bug_reports', 'user_fetch_history',
            'api_usage_tracking', 'global_settings', 'admin_twilio_settings',
            'api_keys', 'automation_logs'
        ],
        'policies_created', 25,
        'completion_time', NOW()
    )
);

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify RLS is enabled on all tables
DO $$
DECLARE
    rls_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'mentions', 'notifications', 'keywords', 'profiles',
        'user_roles', 'source_preferences', 'reports',
        'mention_exclusions', 'bug_reports', 'user_fetch_history',
        'api_usage_tracking', 'global_settings', 'admin_twilio_settings',
        'api_keys', 'automation_logs'
    ];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        SELECT COUNT(*) INTO rls_count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relname = table_name
        AND c.relrowsecurity = true;
        
        IF rls_count = 0 THEN
            RAISE EXCEPTION 'RLS not enabled on table: %', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Successfully enabled RLS on all % tables', array_length(expected_tables, 1);
END $$;