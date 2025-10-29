import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserStatus = 'pending_approval' | 'approved' | 'rejected' | 'suspended' | 'loading' | 'error';

export interface UserStatusData {
  status: UserStatus;
  hasRssUrl: boolean;
  profile: any | null;
  keywords: any[] | null;
}

export function useUserStatus() {
  const [userStatus, setUserStatus] = useState<UserStatusData>({
    status: 'loading',
    hasRssUrl: false,
    profile: null,
    keywords: null
  });

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setUserStatus({
            status: 'error',
            hasRssUrl: false,
            profile: null,
            keywords: null
          });
          return;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError || !profile) {
          setUserStatus({
            status: 'error',
            hasRssUrl: false,
            profile: null,
            keywords: null
          });
          return;
        }

        // Fetch keywords for other purposes (optional - can be used by other components)
        // Note: RSS URL checking removed - approval happens automatically when moderator adds RSS URL
        let keywords = null;

        try {
          const { apiFetch } = await import('@/lib/api');
          const keywordsResponse = await apiFetch(`/admin/keywords-management?user_id=${user.id}`);

          if (keywordsResponse.ok) {
            const keywordsResult = await keywordsResponse.json();
            if (keywordsResult.success && keywordsResult.data) {
              keywords = keywordsResult.data;
            }
          }
        } catch (error) {
          console.log("Keywords API not available");
        }

        // Determine user status based ONLY on profile status
        // RSS URL checking removed - approval happens automatically when moderator adds RSS URL
        let status: UserStatus = profile.user_status as UserStatus;
        
        // Validate status value
        if (!['pending_approval', 'approved', 'rejected', 'suspended'].includes(status)) {
          status = 'error';
        }

        setUserStatus({
          status,
          hasRssUrl: false, // No longer used for access control, but keep for backward compatibility
          profile,
          keywords: keywords || []
        });

      } catch (error) {
        console.error('Error checking user status:', error);
        setUserStatus({
          status: 'error',
          hasRssUrl: false,
          profile: null,
          keywords: null
        });
      }
    };

    checkUserStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        checkUserStatus();
      } else {
        setUserStatus({
          status: 'error',
          hasRssUrl: false,
          profile: null,
          keywords: null
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return userStatus;
}
