// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const { check_frequencies } = await req.json().catch(() => ({ check_frequencies: false }));

    console.log('🔄 Starting automated mention fetch...');

    // Get all active keywords for all users with their fetch frequencies
    const { data: usersWithKeywords, error: keywordsError } = await supabase
      .from('keywords')
      .select(`
        *,
        profiles!inner(fetch_frequency_minutes)
      `);

    if (keywordsError) {
      console.error('Error fetching keywords with profiles:', keywordsError);
      throw keywordsError;
    }

    if (!usersWithKeywords || usersWithKeywords.length === 0) {
      console.log('No keywords found for monitoring');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No keywords to monitor' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let eligibleKeywords = usersWithKeywords;

    // If checking frequencies, filter based on last fetch time and user frequency
    if (check_frequencies) {
      const now = new Date();
      
      // Get the last fetch time for each user from mentions table
      const { data: lastFetches } = await supabase
        .from('mentions')
        .select('user_id, created_at')
        .order('created_at', { ascending: false });

      const userLastFetch = new Map();
      if (lastFetches) {
        for (const fetch of lastFetches) {
          if (!userLastFetch.has(fetch.user_id)) {
            userLastFetch.set(fetch.user_id, new Date(fetch.created_at));
          }
        }
      }

      // Filter keywords based on frequency
      eligibleKeywords = usersWithKeywords.filter(keyword => {
        const userFrequency = keyword.profiles?.fetch_frequency_minutes || 15;
        const lastFetch = userLastFetch.get(keyword.user_id);
        
        if (!lastFetch) {
          // No previous fetch, always fetch
          return true;
        }

        const minutesSinceLastFetch = (now.getTime() - lastFetch.getTime()) / (1000 * 60);
        const shouldFetch = minutesSinceLastFetch >= userFrequency;
        
        if (!shouldFetch) {
          console.log(`Skipping ${keyword.brand_name} - last fetch ${Math.round(minutesSinceLastFetch)}min ago, frequency: ${userFrequency}min`);
        }
        
        return shouldFetch;
      });
    }

    if (eligibleKeywords.length === 0) {
      console.log('No keywords eligible for fetching based on frequency settings');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No keywords due for fetching',
        skipped_due_to_frequency: true
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Processing ${eligibleKeywords.length} eligible keywords for automated fetch`);

    // Trigger aggregate-sources function for each eligible keyword
    const results = await Promise.allSettled(
      eligibleKeywords.map(async (keyword) => {
        try {
          console.log(`🔍 Fetching mentions for keyword: ${keyword.brand_name} (freq: ${keyword.profiles?.fetch_frequency_minutes || 15}min)`);
          
          // Use service key to make authenticated requests
          const response = await fetch(`${supabaseUrl}/functions/v1/aggregate-sources`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              keyword_id: keyword.id,
              automated: true 
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }

          const data = await response.json();
          return { keyword: keyword.brand_name, result: data };
        } catch (err) {
          console.error(`Failed to process keyword ${keyword.brand_name}:`, err);
          throw err;
        }
      })
    );

    // Count successful and failed fetches
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Automated fetch completed: ${successful} successful, ${failed} failed`);

    // Also trigger Google Alerts RSS fetch if any users are due
    if (!check_frequencies || eligibleKeywords.length > 0) {
      try {
        console.log('🔔 Triggering Google Alerts RSS fetch...');
        
        const alertsResponse = await fetch(`${supabaseUrl}/functions/v1/google-alerts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ automated: true })
        });

        if (alertsResponse.ok) {
          console.log('✅ Google Alerts fetch completed');
        } else {
          console.log('⚠️ Google Alerts fetch failed:', await alertsResponse.text());
        }
      } catch (alertsErr) {
        console.error('Google Alerts fetch failed:', alertsErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total_keywords: usersWithKeywords.length,
      eligible_keywords: eligibleKeywords.length,
      successful_fetches: successful,
      failed_fetches: failed,
      frequency_check_enabled: check_frequencies,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Automated fetch error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});