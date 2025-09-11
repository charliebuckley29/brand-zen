import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EscalationEmailRequest {
  mentionId: string;
  escalationType: 'legal' | 'pr';
  mentionData: {
    id: string;
    source_url: string;
    source_name: string;
    content_snippet: string;
    full_text?: string;
    sentiment: number;
    published_at: string;
    topics: string[];
    flagged: boolean;
    internal_notes?: string;
  };
  userEmail: string;
  userName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mentionId, escalationType, mentionData, userEmail, userName }: EscalationEmailRequest = await req.json();

    console.log(`Processing escalation email for mention ${mentionId} to ${escalationType} team`);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Determine recipient email from the mention owner's profile (per-user setting)
    const { data: mentionRow, error: mentionError } = await supabase
      .from('mentions')
      .select('user_id')
      .eq('id', mentionId)
      .maybeSingle();

    if (mentionError) {
      console.error('Error fetching mention owner:', mentionError);
      throw mentionError;
    }

    if (!mentionRow?.user_id) {
      throw new Error('Mention owner not found');
    }

    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('pr_team_email, legal_team_email')
      .eq('user_id', mentionRow.user_id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching owner profile:', profileError);
      throw profileError;
    }

    const teamEmail = (escalationType === 'legal' 
      ? profileRow?.legal_team_email 
      : profileRow?.pr_team_email) as string | null;

    if (!teamEmail) {
      throw new Error(`${escalationType.toUpperCase()} team email not configured for this user`);
    }
    
    // Format sentiment
    const getSentimentLabel = (sentiment: number) => {
      if (sentiment <= 30) return 'Negative';
      if (sentiment >= 51) return 'Positive';
      return 'Neutral';
    };

    const getSentimentColor = (sentiment: number) => {
      if (sentiment <= 30) return '#ef4444';
      if (sentiment >= 51) return '#22c55e';
      return '#6b7280';
    };

    // Format date
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const sentimentLabel = getSentimentLabel(mentionData.sentiment);
    const sentimentColor = getSentimentColor(mentionData.sentiment);

    // Create email content
    const emailSubject = `${escalationType.toUpperCase()} Escalation Alert: ${mentionData.source_name}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">⚠️ ${escalationType.toUpperCase()} Escalation Alert</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">A mention has been escalated and requires your attention</p>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">Mention Details</h2>
            
            <div style="margin-bottom: 15px;">
              <strong style="color: #475569;">Source:</strong> 
              <a href="${mentionData.source_url}" target="_blank" style="color: #3b82f6; text-decoration: none;">
                ${mentionData.source_name}
              </a>
            </div>
            
            <div style="margin-bottom: 15px;">
              <strong style="color: #475569;">Published:</strong> 
              ${formatDate(mentionData.published_at)}
            </div>
            
            <div style="margin-bottom: 15px;">
              <strong style="color: #475569;">Sentiment:</strong> 
              <span style="color: ${sentimentColor}; font-weight: bold;">
                ${sentimentLabel} (${mentionData.sentiment}/100)
              </span>
            </div>
            
            ${mentionData.topics.length > 0 ? `
            <div style="margin-bottom: 15px;">
              <strong style="color: #475569;">Topics:</strong> 
              ${mentionData.topics.map(topic => `<span style="background: #e2e8f0; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 5px;">${topic}</span>`).join('')}
            </div>
            ` : ''}
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1e293b; margin: 0 0 10px 0; font-size: 16px;">Content Preview</h3>
            <p style="color: #64748b; line-height: 1.6; margin: 0; font-style: italic;">
              "${mentionData.content_snippet}"
            </p>
          </div>
          
          ${mentionData.internal_notes ? `
          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">📝 Internal Notes</h3>
            <p style="color: #92400e; margin: 0; line-height: 1.6;">
              ${mentionData.internal_notes}
            </p>
          </div>
          ` : ''}
          
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h3 style="color: #1e293b; margin: 0 0 10px 0; font-size: 16px;">Escalated by</h3>
            <p style="color: #64748b; margin: 0;">
              <strong>${userName}</strong> (${userEmail})
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="${mentionData.source_url}" 
               target="_blank"
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Original Source
            </a>
          </div>
        </div>
        
        <div style="background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px;">
          <p style="margin: 0;">This email was automatically generated by your mention monitoring system.</p>
        </div>
      </div>
    `;

    console.log(`Sending escalation email to ${teamEmail}`);

    const emailResponse = await resend.emails.send({
      from: "Mention Alert <no-reply@resend.dev>",
      to: [teamEmail],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Escalation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      teamEmail,
      escalationType 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-escalation-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);