-- Update buckleycharlie@live.co.uk to admin role
UPDATE public.user_roles 
SET user_type = 'admin'::user_type
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'buckleycharlie@live.co.uk'
  LIMIT 1
);

-- If no user_role exists for this user, insert one
INSERT INTO public.user_roles (user_id, user_type)
SELECT 
  au.id,
  'admin'::user_type
FROM auth.users au
WHERE au.email = 'buckleycharlie@live.co.uk'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = au.id
);

-- Ensure this user has a profile
INSERT INTO public.profiles (user_id, full_name, phone_number, fetch_frequency_minutes)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data ->> 'full_name', 'Admin User') as full_name,
  au.raw_user_meta_data ->> 'phone_number' as phone_number,
  15 as fetch_frequency_minutes
FROM auth.users au
WHERE au.email = 'buckleycharlie@live.co.uk'
AND NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = au.id
);