-- Add PR and legal team email columns to user profiles
ALTER TABLE public.profiles 
ADD COLUMN pr_team_email text,
ADD COLUMN legal_team_email text;

-- Remove the global settings we just added since they should be per-user
DELETE FROM public.global_settings 
WHERE setting_key IN ('pr_team_email', 'legal_team_email');