import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TwilioNotificationRequest {
  mentionId: string;
  userId: string;
  message: string;
  notificationType: 'sms' | 'whatsapp';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Twilio notification function called');

    const { mentionId, userId, message, notificationType }: TwilioNotificationRequest = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Twilio settings from admin config
    const { data: twilioSettings, error: settingsError } = await supabase
      .from('admin_twilio_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (settingsError || !twilioSettings) {
      console.error('Twilio not configured:', settingsError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Twilio service not configured' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user profile with phone number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone_number, notification_preferences')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.phone_number) {
      console.error('User phone number not found:', profileError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User phone number not configured' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user has enabled this notification type
    const preferences = profile.notification_preferences || {};
    if (!preferences[notificationType]) {
      console.log(`User has disabled ${notificationType} notifications`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `${notificationType} notifications disabled by user` 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Prepare Twilio API call
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSettings.account_sid}/Messages.json`;
    const credentials = btoa(`${twilioSettings.account_sid}:${twilioSettings.auth_token}`);
    
    const fromNumber = notificationType === 'whatsapp' 
      ? twilioSettings.whatsapp_from 
      : twilioSettings.sms_from;

    const toNumber = notificationType === 'whatsapp' 
      ? `whatsapp:${profile.phone_number}`
      : profile.phone_number;

    // Send Twilio message
    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: toNumber,
        Body: message,
      }),
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio API error:', twilioResult);
      return new Response(JSON.stringify({ 
        success: false, 
        error: twilioResult.message || 'Failed to send message' 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('Twilio message sent successfully:', twilioResult.sid);

    // Log the notification in the database
    const { error: logError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Negative Mention Alert',
        message: `${notificationType.toUpperCase()} sent: ${message}`,
        type: 'mention',
        data: {
          mention_id: mentionId,
          twilio_sid: twilioResult.sid,
          notification_type: notificationType
        }
      });

    if (logError) {
      console.error('Error logging notification:', logError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      messageId: twilioResult.sid,
      notificationType
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in Twilio notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);