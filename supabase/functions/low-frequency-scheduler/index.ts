// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    });

    console.log('🐌 Low-frequency scheduler starting (15+ min intervals)...');

    // Call the main scheduler with low frequency tier
    const { data, error } = await supabase.functions.invoke('automated-scheduler', {
      body: {
        frequency_tier: 'low'
      }
    });

    if (error) {
      console.error('Error calling automated-scheduler:', error);
      throw error;
    }

    console.log('✅ Low-frequency scheduler completed:', data);

    return new Response(JSON.stringify({
      success: true,
      tier: 'low',
      result: data,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Low-frequency scheduler error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      tier: 'low',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});