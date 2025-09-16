import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserFetchStatus {
  canFetch: boolean;
  minutesUntilNextFetch: number;
  frequency: number;
  lastFetchTime: Date | null;
  lastFetchStats: {
    successful_keywords: number;
    failed_keywords: number;
    successful_fetches: number;
    log: string;
  } | null;
  loading: boolean;
  automationEnabled: boolean;
  updateAutomationEnabled: (enabled: boolean) => Promise<void>;
}

export function useUserFetchStatus(): UserFetchStatus {
  const [status, setStatus] = useState<UserFetchStatus>({
    canFetch: false,
    minutesUntilNextFetch: 0,
    frequency: 15,
    lastFetchTime: null,
    lastFetchStats: null,
    loading: true,
    automationEnabled: false,
    updateAutomationEnabled: async () => {},
  });

  useEffect(() => {
    const checkUserFetchStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setStatus(prev => ({ ...prev, loading: false }));
          return;
        }

        // Get user's fetch frequency and automation settings
        const { data: profile } = await supabase
          .from('profiles')
          .select('fetch_frequency_minutes, automation_enabled')
          .eq('user_id', user.id)
          .maybeSingle();

        const frequency = profile?.fetch_frequency_minutes || 15;
        const automationEnabled = profile?.automation_enabled || false;

        // Check if user can fetch now
        const { data: canFetch } = await supabase.rpc('can_user_fetch', { 
          _user_id: user.id 
        });

        // Get minutes until next fetch
        const { data: minutesUntil } = await supabase.rpc('minutes_until_user_can_fetch', { 
          _user_id: user.id 
        });

        // Get last fetch time and statistics (manual or automated)
        const { data: lastFetch } = await supabase
          .from('user_fetch_history')
          .select('started_at, fetch_type, successful_keywords, failed_keywords, successful_fetches, log')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('Latest fetch from hook:', lastFetch);

        const updateAutomationEnabled = async (enabled: boolean) => {
          const { error } = await supabase
            .from('profiles')
            .update({ automation_enabled: enabled })
            .eq('user_id', user.id);

          if (error) {
            console.error('Failed to update automation setting:', error);
            throw error;
          }

          // Update local state
          setStatus(prev => ({ 
            ...prev, 
            automationEnabled: enabled 
          }));
        };

        setStatus({
          canFetch: !!canFetch,
          minutesUntilNextFetch: minutesUntil || 0,
          frequency,
          lastFetchTime: lastFetch?.started_at ? new Date(lastFetch.started_at) : null,
          lastFetchStats: lastFetch ? {
            successful_keywords: lastFetch.successful_keywords || 0,
            failed_keywords: lastFetch.failed_keywords || 0,
            successful_fetches: lastFetch.successful_fetches || 0,
            log: lastFetch.log || ''
          } : null,
          loading: false,
          automationEnabled,
          updateAutomationEnabled,
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
          console.log('Realtime: User fetch history changed, refreshing status...');
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