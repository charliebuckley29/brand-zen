import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KeywordRow {
  id: string;
  user_id: string;
  brand_name: string;
  variants: string[] | null;
}

function extractBetween(str: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = str.match(regex);
  return match ? match[1].trim() : null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function resolveArticleUrl(link: string): string {
  try {
    const u = new URL(link);
    const urlParam = u.searchParams.get("url");
    if (urlParam) return decodeURIComponent(urlParam);
    return link;
  } catch {
    return link;
  }
}

async function fetchRss(query: string): Promise<Array<{
  link: string;
  source: string;
  published: string;
  description: string;
}>> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RSS fetch failed (${res.status}) for ${query}`);
  const xml = await res.text();

  const items: Array<{ link: string; source: string; published: string; description: string; }> = [];
  const itemRegex = /<item>[\s\S]*?<\/item>/gi;
  const blocks = xml.match(itemRegex) || [];
  for (const block of blocks) {
    const linkRaw = extractBetween(block, "link") || "";
    const sourceRaw = extractBetween(block, "source") || extractBetween(block, "title") || "Unknown";
    const pubRaw = extractBetween(block, "pubDate") || new Date().toUTCString();
    const descRaw = extractBetween(block, "description") || "";

    const link = resolveArticleUrl(stripHtml(linkRaw));
    const source = stripHtml(sourceRaw).replace(/\s*-\s*Google News$/i, "");
    const description = stripHtml(descRaw);
    const published = new Date(pubRaw).toISOString();

    if (link) items.push({ link, source, published, description });
  }
  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const hasJwt = authHeader.startsWith("Bearer ");

  // User-scoped client (respects RLS) when JWT is provided – used for button-triggered refresh
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Admin client (bypasses RLS) – used by cron without JWT to process all keywords
  const adminClient = createClient(supabaseUrl, serviceKey);

  const db = hasJwt ? userClient : adminClient;

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const { keywordId } = body || {};

    let keywordQuery = db.from('keywords').select('id, user_id, brand_name, variants');
    if (keywordId) keywordQuery = keywordQuery.eq('id', keywordId);

    const { data: keywords, error: kwErr } = await keywordQuery;
    if (kwErr) throw kwErr;

    const allMentions: any[] = [];

    for (const kw of (keywords || []) as KeywordRow[]) {
      const queries = [kw.brand_name, ...(kw.variants || [])].filter(Boolean);
      for (const q of queries) {
        try {
          const rssItems = await fetchRss(q);
          for (const it of rssItems) {
            allMentions.push({
              user_id: kw.user_id,
              keyword_id: kw.id,
              source_url: it.link,
              source_name: it.source || 'Unknown',
              published_at: it.published,
              content_snippet: it.description.substring(0, 500),
              full_text: it.description,
            });
          }
        } catch (e) {
          console.log('Query fetch failed', { query: q, error: String(e) });
        }
      }
    }

    // Deduplicate within this run by URL + user_id before upsert
    const seen = new Set<string>();
    const deduped = allMentions.filter((m) => {
      const key = `${m.user_id}|${m.source_url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let inserted = 0;
    const chunkSize = 500;
    for (let i = 0; i < deduped.length; i += chunkSize) {
      const chunk = deduped.slice(i, i + chunkSize);
      const { error: upErr, count } = await db
        .from('mentions')
        .upsert(chunk, { onConflict: 'user_id,source_url', ignoreDuplicates: true, count: 'exact' });
      if (upErr) {
        console.log('Upsert error', upErr.message);
        continue;
      }
      inserted += count || 0;
    }

    console.log(`monitor-news: jwt=${hasJwt} keywords=${keywords?.length || 0} mentions_upserted=${inserted}`);

    return new Response(JSON.stringify({ success: true, processed: keywords?.length || 0, mentions_upserted: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error('monitor-news error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
