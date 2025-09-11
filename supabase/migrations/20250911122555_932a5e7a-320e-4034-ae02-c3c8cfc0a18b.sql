-- Add default settings for escalation team emails
INSERT INTO public.global_settings (setting_key, setting_value, description) 
VALUES 
  ('pr_team_email', '"pr@company.com"', 'Email address for PR team escalations'),
  ('legal_team_email', '"legal@company.com"', 'Email address for legal team escalations')
ON CONFLICT (setting_key) DO NOTHING;