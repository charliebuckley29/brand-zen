-- Seed data for local development
-- This file contains sample data for testing

-- Insert sample global settings
INSERT INTO global_settings (setting_key, setting_value, description) VALUES
('app_name', '"Brand Zen"', 'Application name'),
('max_mentions_per_user', '10000', 'Maximum mentions per user'),
('default_fetch_frequency', '15', 'Default fetch frequency in minutes'),
('maintenance_mode', 'false', 'Maintenance mode toggle')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert sample source configurations
INSERT INTO source_preferences (user_id, source_type, enabled) 
SELECT 
    auth.uid(),
    'rss_news',
    true
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, source_type) DO NOTHING;

INSERT INTO source_preferences (user_id, source_type, enabled) 
SELECT 
    auth.uid(),
    'google_alerts',
    true
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, source_type) DO NOTHING;

-- Insert sample keywords for testing
INSERT INTO keywords (user_id, keyword, brand_name, is_active) 
SELECT 
    auth.uid(),
    'Brand Zen',
    'Brand Zen',
    true
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;
