-- Update user role to admin for buckleycharlie@live.co.uk
UPDATE public.user_roles 
SET user_type = 'admin'::user_type, updated_at = now()
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'buckleycharlie@live.co.uk'
  LIMIT 1
);

-- Insert admin role if user doesn't have a role record yet
INSERT INTO public.user_roles (user_id, user_type)
SELECT id, 'admin'::user_type
FROM auth.users 
WHERE email = 'buckleycharlie@live.co.uk'
  AND id NOT IN (SELECT user_id FROM public.user_roles)
LIMIT 1;