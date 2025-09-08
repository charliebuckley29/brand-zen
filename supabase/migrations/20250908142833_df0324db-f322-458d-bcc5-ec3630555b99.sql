-- Create profiles for existing users who don't have them
INSERT INTO public.profiles (user_id, full_name, phone_number, fetch_frequency_minutes)
SELECT 
  au.id as user_id,
  COALESCE(au.raw_user_meta_data ->> 'full_name', 'User') as full_name,
  au.raw_user_meta_data ->> 'phone_number' as phone_number,
  15 as fetch_frequency_minutes
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL;

-- Ensure the trigger exists for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Also create user_roles for existing users who don't have them
INSERT INTO public.user_roles (user_id, user_type)
SELECT 
  au.id as user_id,
  'basic_user'::user_type as user_type
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE ur.user_id IS NULL;