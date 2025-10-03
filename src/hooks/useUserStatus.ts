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

        // Get user keywords to check for RSS URL
        const { data: keywords, error: keywordsError } = await supabase
          .from('keywords')
          .select('id, google_alert_rss_url, google_alerts_enabled')
          .eq('user_id', user.id);

        const hasRssUrl = keywords?.some(k => k.google_alert_rss_url && k.google_alert_rss_url.trim() !== '') || false;

        // Determine user status
        let status: UserStatus = 'approved'; // Default to approved
        
        if (profile.user_status === 'pending_approval') {
          status = 'pending_approval';
        } else if (profile.user_status === 'rejected') {
          status = 'rejected';
        } else if (profile.user_status === 'suspended') {
          status = 'suspended';
        } else if (profile.user_status === 'approved' && !hasRssUrl) {
          // User is approved but doesn't have RSS URL set up yet
          status = 'pending_approval';
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
