// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    });
    const { check_frequencies, user_id, manual } = await req.json().catch(()=>({
        check_frequencies: false,
        user_id: null,
        manual: false
      }));
    console.log('🔄 Starting automated mention fetch...', { check_frequencies, user_id, manual });

    // If this is a manual fetch for a specific user, check frequency limits
    if (manual && user_id) {
      const { data: canFetch } = await supabase.rpc('can_user_fetch', { _user_id: user_id });
      
      if (!canFetch) {
        const { data: minutesUntil } = await supabase.rpc('minutes_until_user_can_fetch', { _user_id: user_id });
        
        return new Response(JSON.stringify({
          success: false,
          error: 'Rate limit exceeded',
          message: `Please wait ${minutesUntil} more minutes before fetching again`,
          minutes_until_next_fetch: minutesUntil
        }), {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      // Record the start of this fetch attempt
      const { error: historyError } = await supabase
        .from('user_fetch_history')
        .insert({
          user_id: user_id,
          fetch_type: 'manual',
          started_at: new Date().toISOString()
        });
      
      if (historyError) {
        console.error('Failed to record fetch start:', historyError);
      }
    }
    // Get keywords (filtered by user_id if provided)
    let keywordQuery = supabase.from('keywords').select('*');
    if (user_id) {
      keywordQuery = keywordQuery.eq('user_id', user_id);
    }
    const { data: keywords, error: keywordsError } = await keywordQuery;
    if (keywordsError) {
      console.error('Error fetching keywords:', keywordsError);
      throw keywordsError;
    }
    if (!keywords || keywords.length === 0) {
      console.log('No keywords found for monitoring');
      return new Response(JSON.stringify({
        success: true,
        message: 'No keywords to monitor'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get user profiles with fetch frequencies
    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('user_id, fetch_frequency_minutes');
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }
    // Create a map of user_id to fetch frequency
    const userFrequencies = new Map();
    if (profiles) {
      for (const profile of profiles){
        userFrequencies.set(profile.user_id, profile.fetch_frequency_minutes || 15);
      }
    }
    // Add frequency data to keywords
    const usersWithKeywords = keywords.map((keyword)=>({
        ...keyword,
        fetch_frequency_minutes: userFrequencies.get(keyword.user_id) || 15
      }));
    let eligibleKeywords = usersWithKeywords;
    // If checking frequencies, filter based on last fetch time and user frequency
    if (check_frequencies) {
      const now = new Date();
      // Get the last fetch time for each user from mentions table
      const { data: lastFetches } = await supabase.from('mentions').select('user_id, created_at').order('created_at', {
        ascending: false
      });
      const userLastFetch = new Map();
      if (lastFetches) {
        for (const fetch1 of lastFetches){
          if (!userLastFetch.has(fetch1.user_id)) {
            userLastFetch.set(fetch1.user_id, new Date(fetch1.created_at));
          }
        }
      }
      // Filter keywords based on frequency
      eligibleKeywords = usersWithKeywords.filter((keyword)=>{
        const userFrequency = keyword.fetch_frequency_minutes || 15;
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
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`📊 Processing ${eligibleKeywords.length} eligible keywords for ${user_id ? 'user ' + user_id : 'automated fetch'}`);
    // Trigger aggregate-sources function for each eligible keyword
    const results = await Promise.allSettled(eligibleKeywords.map(async (keyword)=>{
      try {
        console.log(`🔍 Fetching mentions for keyword: ${keyword.brand_name} (freq: ${keyword.fetch_frequency_minutes || 15}min)`);
        // Use Supabase client to invoke the function
        const { data, error: invokeError } = await supabase.functions.invoke('aggregate-sources', {
          body: {
            keywordId: keyword.id,
            automated: true
          }
        });
        
        if (invokeError) {
          console.error(`aggregate-sources failed for keyword ${keyword.brand_name}:`, invokeError);
          throw invokeError;
        }
        return {
          keyword: keyword.brand_name,
          result: data
        };
      } catch (err) {
        console.error(`Failed to process keyword ${keyword.brand_name}:`, err);
        console.error(`Error details: ${err.message || 'Unknown error'}`);
        console.error(`Stack trace:`, err.stack);
        throw err;
      }
    }));
    // Count successful and failed fetches
    const successful = results.filter((r)=>r.status === 'fulfilled').length;
    const failed = results.filter((r)=>r.status === 'rejected').length;
    console.log(`✅ Automated fetch completed: ${successful} successful, ${failed} failed`);

    // If this was a manual fetch, record completion
    if (manual && user_id) {
      const { error: updateError } = await supabase
        .from('user_fetch_history')
        .update({
          completed_at: new Date().toISOString(),
          successful_keywords: successful,
          failed_keywords: failed
        })
        .eq('user_id', user_id)
        .eq('fetch_type', 'manual')
        .order('started_at', { ascending: false })
        .limit(1);
      
      if (updateError) {
        console.error('Failed to update fetch completion:', updateError);
      }
    }

    // Update global_settings to track the last fetch time
    try {
      const { error: settingsError } = await supabase
        .from('global_settings')
        .upsert({
          setting_key: 'last_global_fetch',
          setting_value: new Date().toISOString(),
          description: 'Last time automated mention fetch was executed'
        });
      
      if (settingsError) {
        console.error('Failed to update global_settings:', settingsError);
      } else {
        console.log('✅ Updated global_settings with last fetch time');
      }
    } catch (settingsErr) {
      console.error('Error updating global_settings:', settingsErr);
    }
    // Also trigger Google Alerts RSS fetch if any users are due
    if (!check_frequencies || eligibleKeywords.length > 0) {
      try {
        console.log('🔔 Triggering Google Alerts RSS fetch...');
        const { data: alertsData, error: alertsError } = await supabase.functions.invoke('google-alerts', {
          body: {
            automated: true
          }
        });
        
        if (alertsError) {
          console.log('⚠️ Google Alerts fetch failed:', alertsError);
        } else {
          console.log('✅ Google Alerts fetch completed');
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
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('💥 Automated fetch error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
