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

    console.log('🕐 Automated scheduler starting...');

    // Get all users with automation enabled
    const { data: automatedUsers, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, fetch_frequency_minutes')
      .eq('automation_enabled', true);

    if (usersError) {
      console.error('Error fetching automated users:', usersError);
      throw usersError;
    }

    if (!automatedUsers || automatedUsers.length === 0) {
      console.log('No users have automation enabled');
      return new Response(JSON.stringify({
        success: true,
        message: 'No users with automation enabled',
        automated_users: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${automatedUsers.length} users with automation enabled`);

    // Check which users are due for fetching based on their frequency
    const usersToFetch = [];
    
    for (const user of automatedUsers) {
      const { data: canFetch } = await supabase.rpc('can_user_fetch', { 
        _user_id: user.user_id 
      });
      
      if (canFetch) {
        usersToFetch.push(user);
        console.log(`User ${user.user_id} is due for fetching (frequency: ${user.fetch_frequency_minutes}min)`);
      } else {
        console.log(`User ${user.user_id} not due for fetching yet`);
      }
    }

    if (usersToFetch.length === 0) {
      console.log('No users are due for fetching at this time');
      return new Response(JSON.stringify({
        success: true,
        message: 'No users due for fetching',
        automated_users: automatedUsers.length,
        users_fetched: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Trigger fetches for due users
    const fetchResults = await Promise.allSettled(
      usersToFetch.map(async (user) => {
        try {
          console.log(`Triggering automated fetch for user ${user.user_id}`);
          
          const { data, error } = await supabase.functions.invoke('automated-mention-fetch', {
            body: {
              check_frequencies: false, // We already checked
              manual: false, // This is automated
              user_id: user.user_id
            }
          });

          if (error) {
            console.error(`Failed to fetch for user ${user.user_id}:`, error);
            throw error;
          }

          return {
            user_id: user.user_id,
            result: data
          };
        } catch (err) {
          console.error(`Error fetching for user ${user.user_id}:`, err);
          throw err;
        }
      })
    );

    const successful = fetchResults.filter(r => r.status === 'fulfilled').length;
    const failed = fetchResults.filter(r => r.status === 'rejected').length;

    console.log(`✅ Automated scheduler completed: ${successful} users fetched successfully, ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      automated_users: automatedUsers.length,
      users_due: usersToFetch.length,
      users_fetched: successful,
      users_failed: failed,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Automated scheduler error:', error);
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