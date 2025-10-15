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

        // Get user keywords to check for RSS URL - try new API first, fallback to old
        let hasRssUrl = false;
        let keywords = null;

        try {
          const { createApiUrl, getAuthHeaders } = await import('@/lib/api');
          const keywordsResponse = await fetch(`${createApiUrl('/admin/keywords-management')}?user_id=${user.id}`, {
            headers: await getAuthHeaders()
          });

          if (keywordsResponse.ok) {
            const keywordsResult = await keywordsResponse.json();
            if (keywordsResult.success && keywordsResult.data) {
              keywords = keywordsResult.data;
              hasRssUrl = keywordsResult.data.some((k: any) => k.google_alert_rss_url && k.google_alert_rss_url.trim() !== '');
            }
          }
        } catch (newApiError) {
          console.log("New API endpoint not available, falling back to old endpoint");
        }

        // Fallback to old direct Supabase query
        if (keywords === null) {
          const { data: keywordsData, error: keywordsError } = await supabase
            .from('keywords')
            .select('*')
            .eq('user_id', user.id);

          if (!keywordsError && keywordsData) {
            keywords = keywordsData;
            hasRssUrl = keywordsData.some((k: any) => k.google_alert_rss_url && k.google_alert_rss_url.trim() !== '');
          }
        }

        // Determine user status based on profile status and RSS URL
        let status: UserStatus = 'approved'; // Default to approved
        
        if (profile.user_status === 'pending_approval') {
          status = 'pending_approval';
        } else if (profile.user_status === 'rejected') {
          status = 'rejected';
        } else if (profile.user_status === 'suspended') {
          status = 'suspended';
        } else if (profile.user_status === 'approved') {
          // User is approved - check if they have RSS URL for full access
          status = hasRssUrl ? 'approved' : 'pending_approval';
        }

        setUserStatus({
          status,
          hasRssUrl,
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
