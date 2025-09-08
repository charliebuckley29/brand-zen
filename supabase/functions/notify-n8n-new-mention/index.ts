// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

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
    const mention = await req.json();

    console.log("📦 Received mention payload:", JSON.stringify(mention, null, 2));

    const webhookUrl = "http://n8n-alb-546158790.eu-west-2.elb.amazonaws.com/webhook/enrich-mention";

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mention),
    });

    const responseBody = await response.text();

    if (!response.ok) {
      console.error("❌ Failed to send to n8n. Status:", response.status);
      console.error("🔍 n8n response body:", responseBody);

      return new Response(JSON.stringify({
        success: false,
        error: `n8n responded with status ${response.status}`,
        body: responseBody
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Successfully sent to n8n. Status:", response.status);
    console.log("📨 n8n response body:", responseBody);

    return new Response(JSON.stringify({
      success: true,
      status: response.status,
      body: responseBody
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("💥 Error in edge function:", err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});