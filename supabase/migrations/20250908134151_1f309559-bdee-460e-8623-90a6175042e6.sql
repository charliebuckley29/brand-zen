-- Add admin to user_type enum
ALTER TYPE user_type ADD VALUE 'admin';

-- Update the get_user_type function to handle admin
CREATE OR REPLACE FUNCTION public.get_user_type(_user_id uuid)
 RETURNS user_type
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT user_type 
  FROM public.user_roles 
  WHERE user_id = _user_id
  LIMIT 1
$function$;

-- Update the has_access_level function to include admin hierarchy
CREATE OR REPLACE FUNCTION public.has_access_level(_user_id uuid, _required_type user_type)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE 
    WHEN _required_type = 'basic_user' THEN TRUE
    WHEN _required_type = 'pr_user' THEN get_user_type(_user_id) IN ('admin', 'moderator', 'legal_user', 'pr_user')
    WHEN _required_type = 'legal_user' THEN get_user_type(_user_id) IN ('admin', 'moderator', 'legal_user')
    WHEN _required_type = 'moderator' THEN get_user_type(_user_id) IN ('admin', 'moderator')
    WHEN _required_type = 'admin' THEN get_user_type(_user_id) = 'admin'
    ELSE FALSE
  END
$function$;

-- Create API keys table for storing source API configurations
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name text NOT NULL UNIQUE,
  api_key text,
  additional_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on api_keys table  
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can access API keys
CREATE POLICY "Admins can view all API keys" 
ON public.api_keys 
FOR SELECT 
USING (has_access_level(auth.uid(), 'admin'::user_type));

CREATE POLICY "Admins can insert API keys" 
ON public.api_keys 
FOR INSERT 
WITH CHECK (has_access_level(auth.uid(), 'admin'::user_type));

CREATE POLICY "Admins can update API keys" 
ON public.api_keys 
FOR UPDATE 
USING (has_access_level(auth.uid(), 'admin'::user_type));

CREATE POLICY "Admins can delete API keys" 
ON public.api_keys 
FOR DELETE 
USING (has_access_level(auth.uid(), 'admin'::user_type));

-- Add trigger for updated_at
CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default API key entries for existing sources
INSERT INTO public.api_keys (source_name, api_key, additional_config) VALUES
('google_cse', NULL, '{"cx_id": null}'),
('gnews', NULL, '{}'),
('youtube', NULL, '{}'),
('reddit', NULL, '{"client_secret": null}')
ON CONFLICT (source_name) DO NOTHING;