-- Add policy to allow moderators to insert profiles for any user
CREATE POLICY "Moderators can insert profiles for any user"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (has_access_level(auth.uid(), 'moderator'::user_type));

-- Also ensure moderators can insert keywords for any user 
CREATE POLICY "Moderators can insert keywords for any user"
ON public.keywords  
FOR INSERT
TO authenticated
WITH CHECK (has_access_level(auth.uid(), 'moderator'::user_type));