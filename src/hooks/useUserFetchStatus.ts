import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserFetchStatus {
  canFetch: boolean;
  minutesUntilNextFetch: number;
  frequency: number;
  lastFetchTime: Date | null;
  loading: boolean;
}

export function useUserFetchStatus(): UserFetchStatus {
  const [status, setStatus] = useState<UserFetchStatus>({
    canFetch: true,
    minutesUntilNextFetch: 0,
    frequency: 15,
    lastFetchTime: null,
    loading: true
  });

  useEffect(() => {
    const checkUserFetchStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setStatus(prev => ({ ...prev, loading: false }));
          return;
        }

        // Get user's fetch frequency
        const { data: profile } = await supabase
          .from('profiles')
          .select('fetch_frequency_minutes')
          .eq('user_id', user.id)
          .maybeSingle();

        const frequency = profile?.fetch_frequency_minutes || 15;

        // Check if user can fetch now
        const { data: canFetch } = await supabase.rpc('can_user_fetch', { 
          _user_id: user.id 
        });

        // Get minutes until next fetch
        const { data: minutesUntil } = await supabase.rpc('minutes_until_user_can_fetch', { 
          _user_id: user.id 
        });

        // Get last fetch time
        const { data: lastFetch } = await supabase
          .from('user_fetch_history')
          .select('started_at')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setStatus({
          canFetch: !!canFetch,
          minutesUntilNextFetch: minutesUntil || 0,
          frequency,
          lastFetchTime: lastFetch?.started_at ? new Date(lastFetch.started_at) : null,
          loading: false
        });

      } catch (error) {
        console.error('Error checking user fetch status:', error);
        setStatus(prev => ({ ...prev, loading: false }));
      }
    };

    checkUserFetchStatus();

    // Set up realtime subscription to track fetch history changes
    const channel = supabase
      .channel('user-fetch-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_fetch_history'
        },
        () => {
          checkUserFetchStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return status;
}