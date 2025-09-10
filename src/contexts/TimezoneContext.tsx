import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface TimezoneContextType {
  timezone: string;
  updateTimezone: (newTimezone: string) => Promise<void>;
  formatDateTime: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: string | Date) => string;
  formatDate: (date: string | Date) => string;
  formatRelativeTime: (date: string | Date) => string;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export const useTimezone = () => {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
};

interface TimezoneProviderProps {
  children: React.ReactNode;
}

export const TimezoneProvider: React.FC<TimezoneProviderProps> = ({ children }) => {
  const [timezone, setTimezone] = useState<string>('UTC');
  const [user, setUser] = useState<User | null>(null);

  // Set up auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load user's timezone from profile
  useEffect(() => {
    const loadUserTimezone = async () => {
      if (!user) {
        // If no user, use browser's detected timezone
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('user_id', user.id)
        .single();

      if (profile?.timezone) {
        setTimezone(profile.timezone);
      } else {
        // Auto-detect and save user's timezone on first load
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(detectedTimezone);
        
        // Save detected timezone to profile
        await supabase.rpc('detect_user_timezone', {
          _user_id: user.id,
          _timezone: detectedTimezone
        });
      }
    };

    loadUserTimezone();
  }, [user]);

  const updateTimezone = async (newTimezone: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ timezone: newTimezone })
      .eq('user_id', user.id);

    if (!error) {
      setTimezone(newTimezone);
    }
  };

  const formatDateTime = (date: string | Date, options?: Intl.DateTimeFormatOptions) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }).format(dateObj);
  };

  const formatTime = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(dateObj);
  };

  const formatRelativeTime = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    // For older dates, show formatted date in user's timezone
    return formatDate(dateObj);
  };

  const value: TimezoneContextType = {
    timezone,
    updateTimezone,
    formatDateTime,
    formatTime,
    formatDate,
    formatRelativeTime
  };

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  );
};