-- Create enum for user types in order of access importance
CREATE TYPE public.user_type AS ENUM ('moderator', 'legal_user', 'pr_user', 'basic_user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_type user_type NOT NULL DEFAULT 'basic_user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user type
CREATE OR REPLACE FUNCTION public.get_user_type(_user_id UUID)
RETURNS user_type
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_type 
  FROM public.user_roles 
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Create function to check if user has required access level
CREATE OR REPLACE FUNCTION public.has_access_level(_user_id UUID, _required_type user_type)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _required_type = 'basic_user' THEN TRUE
    WHEN _required_type = 'pr_user' THEN get_user_type(_user_id) IN ('moderator', 'legal_user', 'pr_user')
    WHEN _required_type = 'legal_user' THEN get_user_type(_user_id) IN ('moderator', 'legal_user')
    WHEN _required_type = 'moderator' THEN get_user_type(_user_id) = 'moderator'
    ELSE FALSE
  END
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Moderators can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.has_access_level(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (public.has_access_level(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (public.has_access_level(auth.uid(), 'moderator'));

-- Create trigger for updated_at
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default role for existing users
INSERT INTO public.user_roles (user_id, user_type)
SELECT id, 'basic_user'::user_type
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Create trigger to auto-assign basic_user role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, user_type)
  VALUES (NEW.id, 'basic_user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Update RLS policies for existing tables to use role-based access
-- Allow moderators to view all keywords for management
CREATE POLICY "Moderators can view all keywords" 
ON public.keywords 
FOR SELECT 
USING (public.has_access_level(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can update all keywords" 
ON public.keywords 
FOR UPDATE 
USING (public.has_access_level(auth.uid(), 'moderator'));

-- Allow moderators to view all mentions for management
CREATE POLICY "Moderators can view all mentions" 
ON public.mentions 
FOR SELECT 
USING (public.has_access_level(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can update all mentions" 
ON public.mentions 
FOR UPDATE 
USING (public.has_access_level(auth.uid(), 'moderator'));