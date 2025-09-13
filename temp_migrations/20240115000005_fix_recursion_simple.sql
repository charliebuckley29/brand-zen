-- Migration: Fix Infinite Recursion - Simple Approach
-- Description: Simply removes the problematic admin policies that cause infinite recursion
-- Priority: CRITICAL - Must be applied immediately

-- ========================================
-- REMOVE PROBLEMATIC POLICIES
-- ========================================

-- Remove the admin policies that cause infinite recursion
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
-- CREATE BASIC POLICIES WITHOUT ADMIN CHECKS
-- ========================================

-- User roles - basic policies only
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
CREATE POLICY "Users can view own role" ON user_roles
FOR SELECT USING (auth.uid() = user_id);

-- Profiles - basic policies only  
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert profiles" ON profiles;
CREATE POLICY "System can insert profiles" ON profiles
FOR INSERT WITH CHECK (true);

-- Keywords - basic policies only
DROP POLICY IF EXISTS "Users can manage own keywords" ON keywords;
CREATE POLICY "Users can manage own keywords" ON keywords
FOR ALL USING (auth.uid() = user_id);

-- Source preferences - basic policies only
DROP POLICY IF EXISTS "Users can manage own source preferences" ON source_preferences;
CREATE POLICY "Users can manage own source preferences" ON source_preferences
FOR ALL USING (auth.uid() = user_id);

-- Reports - basic policies only
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert reports" ON reports;
CREATE POLICY "System can insert reports" ON reports
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own reports" ON reports;
CREATE POLICY "Users can update own reports" ON reports
FOR UPDATE USING (auth.uid() = user_id);

-- Mentions - basic policies only
DROP POLICY IF EXISTS "Users can view own mentions" ON mentions;
CREATE POLICY "Users can view own mentions" ON mentions
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert mentions" ON mentions;
CREATE POLICY "System can insert mentions" ON mentions
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own mentions" ON mentions;
CREATE POLICY "Users can update own mentions" ON mentions
FOR UPDATE USING (auth.uid() = user_id);

-- Notifications - basic policies only
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
FOR UPDATE USING (auth.uid() = user_id);

-- Bug reports - basic policies only
DROP POLICY IF EXISTS "Users can view own bug reports" ON bug_reports;
CREATE POLICY "Users can view own bug reports" ON bug_reports
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert bug reports" ON bug_reports;
CREATE POLICY "Users can insert bug reports" ON bug_reports
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bug reports" ON bug_reports;
CREATE POLICY "Users can update own bug reports" ON bug_reports
FOR UPDATE USING (auth.uid() = user_id);

-- Bug report comments - basic policies only
DROP POLICY IF EXISTS "Users can view bug report comments" ON bug_report_comments;
CREATE POLICY "Users can view bug report comments" ON bug_report_comments
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert bug report comments" ON bug_report_comments;
CREATE POLICY "Users can insert bug report comments" ON bug_report_comments
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bug report comments" ON bug_report_comments;
CREATE POLICY "Users can update own bug report comments" ON bug_report_comments
FOR UPDATE USING (auth.uid() = user_id);

-- Mention exclusions - basic policies only
DROP POLICY IF EXISTS "Users can manage own mention exclusions" ON mention_exclusions;
CREATE POLICY "Users can manage own mention exclusions" ON mention_exclusions
FOR ALL USING (auth.uid() = user_id);

-- User fetch history - basic policies only
DROP POLICY IF EXISTS "Users can view own fetch history" ON user_fetch_history;
CREATE POLICY "Users can view own fetch history" ON user_fetch_history
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert user fetch history" ON user_fetch_history;
CREATE POLICY "System can insert user fetch history" ON user_fetch_history
FOR INSERT WITH CHECK (true);
