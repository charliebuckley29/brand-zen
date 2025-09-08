-- Create global settings table
CREATE TABLE public.global_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Only moderators can view and modify global settings
CREATE POLICY "Moderators can view all global settings" 
ON public.global_settings 
FOR SELECT 
USING (has_access_level(auth.uid(), 'moderator'::user_type));

CREATE POLICY "Moderators can insert global settings" 
ON public.global_settings 
FOR INSERT 
WITH CHECK (has_access_level(auth.uid(), 'moderator'::user_type));

CREATE POLICY "Moderators can update global settings" 
ON public.global_settings 
FOR UPDATE 
USING (has_access_level(auth.uid(), 'moderator'::user_type));

-- Add trigger for updated_at
CREATE TRIGGER update_global_settings_updated_at
BEFORE UPDATE ON public.global_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the default setting
INSERT INTO public.global_settings (setting_key, setting_value, description)
VALUES (
  'usersCanChangeBrandName',
  'true'::jsonb,
  'Controls whether basic users can change their brand name and variants in settings'
);

-- Create a function to get global setting values easily
CREATE OR REPLACE FUNCTION public.get_global_setting(_setting_key text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT setting_value 
  FROM public.global_settings 
  WHERE setting_key = _setting_key
  LIMIT 1
$$;