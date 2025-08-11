import { supabase } from "@/integrations/supabase/client";

export interface MentionData {
  source_name: string;
  source_url: string;
  published_at: string;
  content_snippet: string;
  full_text?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  topics?: string[];
  flagged?: boolean;
  escalation_type?: 'none' | 'pr' | 'legal' | 'crisis';
  internal_notes?: string;
}

export async function saveMention(keywordId: string, mentionData: MentionData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("mentions")
    .insert({
      keyword_id: keywordId,
      user_id: user.id,
      ...mentionData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserKeywords() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("keywords")
    .select("*")
    .eq("user_id", user.id);

  if (error) throw error;
  return data;
}

export async function getUserMentions(limit = 50) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("mentions")
    .select(`
      *,
      keywords!inner(brand_name)
    `)
    .eq("user_id", user.id)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function startMonitoring(keywordId: string) {
  const { data, error } = await supabase.functions.invoke('aggregate-sources', {
    body: { keywordId }
  });

  if (error) throw error;
  return data;
}

export async function analyzeSentiment(text: string): Promise<'positive' | 'negative' | 'neutral'> {
  // Simple sentiment analysis - in a real app, you'd use a proper service
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'awesome', 'fantastic', 'wonderful', 'perfect', 'best'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disgusting', 'disappointing', 'useless', 'poor'];
  
  const words = text.toLowerCase().split(/\s+/);
  const positiveCount = words.filter(word => positiveWords.includes(word)).length;
  const negativeCount = words.filter(word => negativeWords.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

export async function flagMention(mentionId: string, escalationType: string, notes?: string) {
  const { data, error } = await supabase
    .from("mentions")
    .update({
      flagged: true,
      escalation_type: escalationType,
      internal_notes: notes
    })
    .eq("id", mentionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function excludeMention(mentionId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch mention to get keyword and URL
  const { data: mention, error: fetchErr } = await supabase
    .from("mentions")
    .select("id, keyword_id, source_url")
    .eq("id", mentionId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!mention) throw new Error("Mention not found");

  // Insert exclusion
  const sourceDomain = (() => {
    try { return new URL(mention.source_url).hostname.replace(/^www\./, ""); } catch { return null; }
  })();

  const { error: insertErr } = await supabase
    .from("mention_exclusions")
    .insert({
      user_id: user.id,
      keyword_id: mention.keyword_id,
      source_url: mention.source_url,
      source_domain: sourceDomain,
      reason: "not_me",
    });
  if (insertErr && insertErr.code !== '23505') { // ignore unique violation
    throw insertErr;
  }

  // Delete the mention from the user's list
  const { error: delErr } = await supabase
    .from("mentions")
    .delete()
    .eq("id", mentionId)
    .eq("user_id", user.id);
  if (delErr) throw delErr;

  return { success: true };
}