-- Create function to get user emails (only for moderators)
CREATE OR REPLACE FUNCTION public.get_user_emails_for_moderator()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Only allow moderators to access this function  
  SELECT au.id as user_id, au.email
  FROM auth.users au
  WHERE has_access_level(auth.uid(), 'moderator'::user_type) = true;
$$;