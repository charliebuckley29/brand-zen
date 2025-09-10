-- Add automation_enabled column to profiles table to track per-user automation state
ALTER TABLE public.profiles 
ADD COLUMN automation_enabled boolean NOT NULL DEFAULT false;

-- Create index for efficient querying of users with automation enabled
CREATE INDEX idx_profiles_automation_enabled ON public.profiles(automation_enabled) WHERE automation_enabled = true;