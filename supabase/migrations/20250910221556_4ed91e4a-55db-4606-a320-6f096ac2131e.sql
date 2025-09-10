-- Add timezone support to user profiles
ALTER TABLE profiles 
ADD COLUMN timezone text DEFAULT 'UTC';

-- Create index for better performance
CREATE INDEX idx_profiles_timezone ON profiles(timezone);

-- Add timezone detection function
CREATE OR REPLACE FUNCTION detect_user_timezone(_user_id uuid, _timezone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE profiles 
  SET timezone = _timezone,
      updated_at = now()
  WHERE user_id = _user_id;
END;
$$;