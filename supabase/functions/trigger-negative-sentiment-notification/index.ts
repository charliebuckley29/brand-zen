import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentionTriggerRequest {
  mentionId: string;
  userId: string;
  sentiment: number;
  content: string;
  source: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Negative sentiment notification trigger called');

    const { mentionId, userId, sentiment, content, source }: MentionTriggerRequest = await req.json();

    // Only trigger for negative sentiment (less than 40)
    if (sentiment >= 40) {
      console.log(`Sentiment ${sentiment} is not negative enough to trigger notifications`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Sentiment not negative enough' 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user notification preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('notification_preferences, phone_number, full_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('User profile not found:', profileError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User profile not found' 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const preferences = profile.notification_preferences || {};
    const hasNotifications = preferences.sms || preferences.whatsapp;

    if (!hasNotifications || !profile.phone_number) {
      console.log('User has no notification preferences enabled or no phone number');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No notifications enabled or no phone number' 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Prepare the notification message
    const message = `🚨 Negative mention alert!\n\nSource: ${source}\nSentiment Score: ${sentiment}%\n\nContent: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}\n\nReview at your dashboard to take action.`;

    const notifications = [];

    // Send SMS if enabled
    if (preferences.sms) {
      try {
        const smsResponse = await supabase.functions.invoke('send-twilio-notification', {
          body: {
            mentionId,
            userId,
            message,
            notificationType: 'sms'
          }
        });

        if (smsResponse.error) {
          console.error('SMS notification error:', smsResponse.error);
        } else {
          notifications.push('SMS');
        }
      } catch (error) {
        console.error('SMS notification failed:', error);
      }
    }

    // Send WhatsApp if enabled
    if (preferences.whatsapp) {
      try {
        const whatsappResponse = await supabase.functions.invoke('send-twilio-notification', {
          body: {
            mentionId,
            userId,
            message,
            notificationType: 'whatsapp'
          }
        });

        if (whatsappResponse.error) {
          console.error('WhatsApp notification error:', whatsappResponse.error);
        } else {
          notifications.push('WhatsApp');
        }
      } catch (error) {
        console.error('WhatsApp notification failed:', error);
      }
    }

    console.log(`Negative sentiment notifications sent: ${notifications.join(', ')}`);

    return new Response(JSON.stringify({ 
      success: true,
      notificationsSent: notifications,
      sentiment,
      userId
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in negative sentiment notification trigger:", error);
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