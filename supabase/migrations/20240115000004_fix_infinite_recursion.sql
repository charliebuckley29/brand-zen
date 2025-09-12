-- Migration: Fix Infinite Recursion in RLS Policies
-- Description: Fixes circular reference in user_roles RLS policies that causes infinite recursion
-- Priority: CRITICAL - Must be applied immediately

-- ========================================
-- DROP PROBLEMATIC POLICIES
-- ========================================

-- Drop all policies that reference user_roles table in their conditions
DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can access all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can access all keywords" ON keywords;
DROP POLICY IF EXISTS "Admins can access all source preferences" ON source_preferences;
DROP POLICY IF EXISTS "Admins can access all reports" ON reports;
DROP POLICY IF EXISTS "Admins can access all mentions" ON mentions;
DROP POLICY IF EXISTS "Admins can access all notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can access all bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Admins can access all bug report comments" ON bug_report_comments;
DROP POLICY IF EXISTS "Admins can access all mention exclusions" ON mention_exclusions;
DROP POLICY IF EXISTS "Admins can access all user fetch history" ON user_fetch_history;

-- ========================================
-- CREATE SAFE ADMIN CHECK FUNCTION
-- ========================================

-- Create a function that safely checks if a user is an admin
-- This function uses a direct query without RLS to avoid recursion
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = is_admin.user_id 
    AND user_roles.user_type = 'admin'
  );
$$;

-- ========================================
-- RECREATE POLICIES WITH SAFE ADMIN CHECK
-- ========================================

-- User roles policies
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
CREATE POLICY "Users can view own role" ON user_roles
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert user roles" ON user_roles;
CREATE POLICY "System can insert user roles" ON user_roles
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage user roles" ON user_roles
FOR ALL USING (is_admin());

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert profiles" ON profiles;
CREATE POLICY "System can insert profiles" ON profiles
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can access all profiles" ON profiles
FOR ALL USING (is_admin());

-- Keywords policies
DROP POLICY IF EXISTS "Users can manage own keywords" ON keywords;
CREATE POLICY "Users can manage own keywords" ON keywords
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can access all keywords" ON keywords
FOR ALL USING (is_admin());

-- Source preferences policies
DROP POLICY IF EXISTS "Users can manage own source preferences" ON source_preferences;
CREATE POLICY "Users can manage own source preferences" ON source_preferences
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can access all source preferences" ON source_preferences
FOR ALL USING (is_admin());

-- Reports policies
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert reports" ON reports;
CREATE POLICY "System can insert reports" ON reports
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own reports" ON reports;
CREATE POLICY "Users can update own reports" ON reports
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can access all reports" ON reports
FOR ALL USING (is_admin());

-- Mentions policies
DROP POLICY IF EXISTS "Users can view own mentions" ON mentions;
CREATE POLICY "Users can view own mentions" ON mentions
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert mentions" ON mentions;
CREATE POLICY "System can insert mentions" ON mentions
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own mentions" ON mentions;
CREATE POLICY "Users can update own mentions" ON mentions
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can access all mentions" ON mentions
FOR ALL USING (is_admin());

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can access all notifications" ON notifications
FOR ALL USING (is_admin());

-- Bug reports policies
DROP POLICY IF EXISTS "Users can view own bug reports" ON bug_reports;
CREATE POLICY "Users can view own bug reports" ON bug_reports
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert bug reports" ON bug_reports;
CREATE POLICY "Users can insert bug reports" ON bug_reports
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bug reports" ON bug_reports;
CREATE POLICY "Users can update own bug reports" ON bug_reports
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can access all bug reports" ON bug_reports
FOR ALL USING (is_admin());

-- Bug report comments policies
DROP POLICY IF EXISTS "Users can view bug report comments" ON bug_report_comments;
CREATE POLICY "Users can view bug report comments" ON bug_report_comments
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert bug report comments" ON bug_report_comments;
CREATE POLICY "Users can insert bug report comments" ON bug_report_comments
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bug report comments" ON bug_report_comments;
CREATE POLICY "Users can update own bug report comments" ON bug_report_comments
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can access all bug report comments" ON bug_report_comments
FOR ALL USING (is_admin());

-- Mention exclusions policies
DROP POLICY IF EXISTS "Users can manage own mention exclusions" ON mention_exclusions;
CREATE POLICY "Users can manage own mention exclusions" ON mention_exclusions
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can access all mention exclusions" ON mention_exclusions
FOR ALL USING (is_admin());

-- User fetch history policies
DROP POLICY IF EXISTS "Users can view own fetch history" ON user_fetch_history;
CREATE POLICY "Users can view own fetch history" ON user_fetch_history
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert user fetch history" ON user_fetch_history;
CREATE POLICY "System can insert user fetch history" ON user_fetch_history
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can access all user fetch history" ON user_fetch_history
FOR ALL USING (is_admin());

-- ========================================
-- GRANT NECESSARY PERMISSIONS
-- ========================================

-- Grant execute permission on the is_admin function to authenticated users
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
