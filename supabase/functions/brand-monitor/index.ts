import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MentionData {
  source_name: string;
  source_url: string;
  published_at: string;
  content_snippet: string;
  full_text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: string[];
  flagged: boolean;
  escalation_type: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keywordId } = await req.json();
    
    if (!keywordId) {
      return new Response(
        JSON.stringify({ error: 'Keyword ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the keyword data
    const { data: keyword, error: keywordError } = await supabase
      .from('keywords')
      .select('*')
      .eq('id', keywordId)
      .single();

    if (keywordError || !keyword) {
      return new Response(
        JSON.stringify({ error: 'Keyword not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate sample mentions based on the brand name and variants
    const sampleMentions: MentionData[] = [
      {
        source_name: "TechCrunch",
        source_url: `https://techcrunch.com/example-${keyword.brand_name.toLowerCase()}`,
        published_at: new Date().toISOString(),
        content_snippet: `${keyword.brand_name} continues to innovate with their latest product updates. Users are responding positively to the new features.`,
        full_text: `${keyword.brand_name} continues to innovate with their latest product updates. Users are responding positively to the new features. The company has shown remarkable growth this quarter.`,
        sentiment: 'positive',
        topics: ['innovation', 'product updates', 'user feedback'],
        flagged: false,
        escalation_type: 'none'
      },
      {
        source_name: "Reddit",
        source_url: `https://reddit.com/r/technology/comments/example-${keyword.brand_name.toLowerCase()}`,
        published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        content_snippet: `Has anyone else had issues with ${keyword.brand_name} recently? Their customer service seems slow.`,
        full_text: `Has anyone else had issues with ${keyword.brand_name} recently? Their customer service seems slow. I've been waiting for a response for days.`,
        sentiment: 'negative',
        topics: ['customer service', 'support issues'],
        flagged: true,
        escalation_type: 'pr'
      },
      {
        source_name: "Twitter",
        source_url: `https://twitter.com/user/status/example-${keyword.brand_name.toLowerCase()}`,
        published_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        content_snippet: `Just tried ${keyword.brand_name} for the first time. Pretty decent experience overall.`,
        full_text: `Just tried ${keyword.brand_name} for the first time. Pretty decent experience overall. Nothing spectacular but does what it says.`,
        sentiment: 'neutral',
        topics: ['first impression', 'user experience'],
        flagged: false,
        escalation_type: 'none'
      }
    ];

    // Save mentions to database
    const savedMentions = [];
    for (const mention of sampleMentions) {
      const { data: savedMention, error: mentionError } = await supabase
        .from('mentions')
        .insert({
          keyword_id: keywordId,
          user_id: keyword.user_id,
          ...mention
        })
        .select()
        .single();

      if (!mentionError && savedMention) {
        savedMentions.push(savedMention);
      }
    }

    console.log(`Generated ${savedMentions.length} mentions for brand: ${keyword.brand_name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        mentionsCreated: savedMentions.length,
        brand: keyword.brand_name 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in brand-monitor function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});