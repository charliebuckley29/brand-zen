// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Configuration
const BATCH_SIZE = 10; // Process users in batches
const MAX_CONCURRENT_BATCHES = 3; // Max concurrent batches
const BATCH_TIMEOUT_MS = 30000; // 30 second timeout per batch

async function processBatch(supabase: any, users: any[], batchId: string) {
  console.log(`📦 Processing batch ${batchId} with ${users.length} users`);
  
  const batchStartTime = Date.now();
  
  // Record batch start
  const { data: batch } = await supabase
    .from('fetch_batches')
    .insert({
      batch_id: batchId,
      user_count: users.length,
      status: 'processing',
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  try {
    // Use background task for processing
    const processingPromise = Promise.allSettled(
      users.map(async (user) => {
        const userStartTime = Date.now();
        
        try {
          console.log(`🔄 Batch ${batchId}: Fetching for user ${user.user_id}`);
          
          const { data, error } = await supabase.functions.invoke('automated-mention-fetch', {
            body: {
              check_frequencies: false,
              manual: false,
              user_id: user.user_id
            }
          });

          if (error) {
            console.error(`❌ Batch ${batchId}: Failed for user ${user.user_id}:`, error);
            throw error;
          }

          const processingTime = Date.now() - userStartTime;
          console.log(`✅ Batch ${batchId}: User ${user.user_id} completed in ${processingTime}ms`);

          return {
            user_id: user.user_id,
            success: true,
            processing_time: processingTime,
            result: data
          };
        } catch (err) {
          const processingTime = Date.now() - userStartTime;
          console.error(`💥 Batch ${batchId}: Error for user ${user.user_id}:`, err);
          
          return {
            user_id: user.user_id,
            success: false,
            processing_time: processingTime,
            error: err.message
          };
        }
      })
    );

    // Apply timeout to the batch
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Batch timeout')), BATCH_TIMEOUT_MS)
    );

    const results = await Promise.race([processingPromise, timeoutPromise]) as any[];
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    const batchProcessingTime = Date.now() - batchStartTime;

    // Update batch status
    await supabase
      .from('fetch_batches')
      .update({
        status: 'completed',
        successful_users: successful,
        failed_users: failed,
        completed_at: new Date().toISOString(),
        processing_time_ms: batchProcessingTime
      })
      .eq('id', batch.id);

    // Record metrics
    await supabase
      .from('automation_metrics')
      .insert({
        metric_type: 'batch_processed',
        metric_value: successful,
        metadata: {
          batch_id: batchId,
          batch_size: users.length,
          successful_users: successful,
          failed_users: failed,
          processing_time_ms: batchProcessingTime,
          avg_user_time_ms: Math.round(batchProcessingTime / users.length)
        }
      });

    console.log(`✅ Batch ${batchId} completed: ${successful} successful, ${failed} failed in ${batchProcessingTime}ms`);
    
    return { successful, failed, processing_time: batchProcessingTime };
    
  } catch (error) {
    console.error(`💥 Batch ${batchId} failed:`, error);
    
    // Update batch as failed
    await supabase
      .from('fetch_batches')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', batch.id);

    throw error;
  }
}

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

    const requestBody = await req.json().catch(() => ({}));
    const { frequency_tier } = requestBody;

    console.log(`🕐 Automated scheduler starting for tier: ${frequency_tier || 'all'}...`);

    // Get users by frequency tier if specified
    let automatedUsers;
    if (frequency_tier) {
      const { data, error } = await supabase.rpc('get_users_by_frequency_tier', { 
        tier: frequency_tier 
      });
      
      if (error) {
        console.error('Error fetching users by tier:', error);
        throw error;
      }
      
      automatedUsers = data;
    } else {
      // Fallback to all users (backward compatibility)
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, fetch_frequency_minutes')
        .eq('automation_enabled', true);

      if (error) {
        console.error('Error fetching automated users:', error);
        throw error;
      }

      automatedUsers = data;
    }

    if (!automatedUsers || automatedUsers.length === 0) {
      console.log(`No users found for tier: ${frequency_tier || 'all'}`);
      return new Response(JSON.stringify({
        success: true,
        message: `No users found for tier: ${frequency_tier || 'all'}`,
        automated_users: 0,
        frequency_tier
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${automatedUsers.length} users for tier: ${frequency_tier || 'all'}`);

    // Check which users are due for fetching
    const usersToFetch = [];
    
    for (const user of automatedUsers) {
      const { data: canFetch } = await supabase.rpc('can_user_fetch', { 
        _user_id: user.user_id 
      });
      
      if (canFetch) {
        usersToFetch.push(user);
        console.log(`User ${user.user_id} is due for fetching (frequency: ${user.fetch_frequency_minutes}min)`);
      }
    }

    if (usersToFetch.length === 0) {
      console.log('No users are due for fetching at this time');
      return new Response(JSON.stringify({
        success: true,
        message: 'No users due for fetching',
        automated_users: automatedUsers.length,
        users_fetched: 0,
        frequency_tier
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create batches
    const batches = [];
    for (let i = 0; i < usersToFetch.length; i += BATCH_SIZE) {
      const batch = usersToFetch.slice(i, i + BATCH_SIZE);
      const batchId = `batch_${Date.now()}_${Math.floor(i / BATCH_SIZE) + 1}`;
      batches.push({ users: batch, id: batchId });
    }

    console.log(`📦 Created ${batches.length} batches for ${usersToFetch.length} users`);

    // Process batches with concurrency limit
    const batchResults = [];
    for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
      const currentBatches = batches.slice(i, i + MAX_CONCURRENT_BATCHES);
      
      const batchPromises = currentBatches.map(batch => 
        processBatch(supabase, batch.users, batch.id)
      );

      const results = await Promise.allSettled(batchPromises);
      batchResults.push(...results);
    }

    // Calculate totals
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalProcessingTime = 0;

    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        totalSuccessful += result.value.successful;
        totalFailed += result.value.failed;
        totalProcessingTime += result.value.processing_time;
      } else {
        totalFailed += BATCH_SIZE; // Assume worst case for failed batches
      }
    });

    // Record overall metrics
    await supabase
      .from('automation_metrics')
      .insert({
        metric_type: 'scheduler_run',
        metric_value: totalSuccessful,
        metadata: {
          frequency_tier: frequency_tier || 'all',
          total_users: usersToFetch.length,
          total_batches: batches.length,
          successful_users: totalSuccessful,
          failed_users: totalFailed,
          total_processing_time_ms: totalProcessingTime,
          avg_batch_time_ms: Math.round(totalProcessingTime / batches.length)
        }
      });

    console.log(`✅ Scheduler completed: ${totalSuccessful} users fetched, ${totalFailed} failed across ${batches.length} batches`);

    return new Response(JSON.stringify({
      success: true,
      automated_users: automatedUsers.length,
      users_due: usersToFetch.length,
      batches_processed: batches.length,
      users_fetched: totalSuccessful,
      users_failed: totalFailed,
      frequency_tier: frequency_tier || 'all',
      avg_processing_time_ms: Math.round(totalProcessingTime / batches.length),
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