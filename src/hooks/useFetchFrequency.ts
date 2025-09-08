import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useFetchFrequency() {
  const [frequency, setFrequency] = useState<number>(15);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserFrequency = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setFrequency(15); // Default for non-authenticated users
          setLoading(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('fetch_frequency_minutes')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching frequency:', error);
        }

        setFrequency(profile?.fetch_frequency_minutes || 15);
      } catch (error) {
        console.error('Error in fetchUserFrequency:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserFrequency();
  }, []);

  return { frequency, loading };
}