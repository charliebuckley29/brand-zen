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

    console.log('🔄 Starting automated mention fetch...');

    // Get all active keywords for all users
    const { data: keywords, error: keywordsError } = await supabase
      .from('keywords')
      .select('*');

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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Processing ${keywords.length} keywords for automated fetch`);

    // Trigger aggregate-sources function for each keyword
    const results = await Promise.allSettled(
      keywords.map(async (keyword) => {
        try {
          console.log(`🔍 Fetching mentions for keyword: ${keyword.brand_name}`);
          
          const { data, error } = await supabase.functions.invoke('aggregate-sources', {
            body: { 
              keyword_id: keyword.id,
              automated: true 
            }
          });

          if (error) {
            console.error(`Error fetching for keyword ${keyword.brand_name}:`, error);
            throw error;
          }

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

    // Also trigger Google Alerts RSS fetch
    try {
      console.log('🔔 Triggering Google Alerts RSS fetch...');
      
      const { data: alertsData, error: alertsError } = await supabase.functions.invoke('google-alerts', {
        body: { automated: true }
      });

      if (alertsError) {
        console.error('Error with Google Alerts fetch:', alertsError);
      } else {
        console.log('✅ Google Alerts fetch completed');
      }
    } catch (alertsErr) {
      console.error('Google Alerts fetch failed:', alertsErr);
    }

    return new Response(JSON.stringify({
      success: true,
      processed_keywords: keywords.length,
      successful_fetches: successful,
      failed_fetches: failed,
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