-- Create function to update user email (moderators only)
CREATE OR REPLACE FUNCTION public.update_user_email_by_moderator(target_user_id uuid, new_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if current user is a moderator
  IF NOT has_access_level(auth.uid(), 'moderator'::user_type) THEN
    RAISE EXCEPTION 'Access denied: Only moderators can update user emails';
  END IF;

  -- Update the user's email in the auth.users table
  UPDATE auth.users 
  SET email = new_email, 
      email_confirmed_at = now(),
      updated_at = now()
  WHERE id = target_user_id;

  RETURN FOUND;
END;
$$;