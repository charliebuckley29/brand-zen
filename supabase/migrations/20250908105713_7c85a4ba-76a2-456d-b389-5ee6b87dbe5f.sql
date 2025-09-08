-- Find and set the user with email buckleycharlie@live.co.uk as moderator
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find the user ID for the email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = 'buckleycharlie@live.co.uk';
    
    IF target_user_id IS NOT NULL THEN
        -- Update or insert the user role as moderator
        INSERT INTO public.user_roles (user_id, user_type)
        VALUES (target_user_id, 'moderator')
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            user_type = 'moderator',
            updated_at = now();
        
        RAISE NOTICE 'User % has been set as moderator', target_user_id;
    ELSE
        RAISE NOTICE 'User with email buckleycharlie@live.co.uk not found';
    END IF;
END $$;