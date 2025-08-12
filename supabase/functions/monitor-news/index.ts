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
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "i");
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

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractMetaContent(html: string, attr: 'property' | 'name', key: string): string | null {
  const regex = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

function extractTitle(html: string): string | null {
  // Prefer og:title, then <title>
  const og = extractMetaContent(html, 'property', 'og:title') || extractMetaContent(html, 'name', 'twitter:title');
  if (og) return stripHtml(og);
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripHtml(m[1]).trim() : null;
}

function extractMainText(html: string): string | null {
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  const container = articleMatch ? articleMatch[0] : html;
  const pMatches = Array.from(container.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi));
  const paragraphs = pMatches.map(m => stripHtml(m[1]).trim()).filter(Boolean);
  const metaDesc = extractMetaContent(html, 'property', 'og:description')
    || extractMetaContent(html, 'name', 'description')
    || extractMetaContent(html, 'name', 'twitter:description');
  const text = paragraphs.length ? paragraphs.join('\n\n') : (metaDesc ? stripHtml(metaDesc) : null);
  return text ? text.replace(/\s+\n/g, '\n').trim() : null;
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripSourceSuffix(title: string | null, source: string | null): string {
  if (!title) return '';
  let t = title.trim();
  if (source) {
    const pat = new RegExp(`\\s*[–-]\\s*${escapeRegex(source.trim())}$`, 'i');
    t = t.replace(pat, '');
  }
  t = t.replace(/\\s*[–-]\\s*Google News$/i, '');
  return t.trim();
}

function cleanSnippet(s: string): string {
  return stripHtml(s)
    .replace(/\bhttps?:\/\/\S+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
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

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);
  const db = hasJwt ? userClient : adminClient;

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const { keywordId } = body || {};

    let keywordQuery = db.from('keywords').select('id, user_id, brand_name, variants');
    if (keywordId) keywordQuery = keywordQuery.eq('id', keywordId);

    const { data: keywords, error: kwErr } = await keywordQuery;
    if (kwErr) throw kwErr;

    // Build map of news preference per user
    const userIds = Array.from(new Set((keywords || []).map((k: any) => k.user_id)));
    const newsPref = new Map<string, boolean>();
    if (userIds.length) {
      const { data: prefs } = await db
        .from('source_preferences')
        .select('user_id, source_type, show_in_mentions')
        .in('user_id', userIds);
      for (const u of userIds) newsPref.set(u, true); // default true
      for (const p of (prefs || []) as any[]) {
        if (p.source_type === 'news') newsPref.set(p.user_id, p.show_in_mentions !== false);
      }
    }

    const allMentions: any[] = [];

    for (const kw of (keywords || []) as KeywordRow[]) {
      if (newsPref.get(kw.user_id) === false) continue; // respect preference
      const queries = [kw.brand_name, ...(kw.variants || [])].filter(Boolean);
      for (const q of queries) {
        try {
          const rssItems = await (async () => {
            const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`RSS fetch failed (${res.status}) for ${q}`);
            const xml = await res.text();
            const items: Array<{ link: string; source: string; published: string; description: string; title: string; }> = [];
            const itemRegex = /<item>[\s\S]*?<\/item>/gi;
            const blocks = xml.match(itemRegex) || [];
            for (const block of blocks) {
              const linkRaw = extractBetween(block, "link") || "";
              const titleRaw = extractBetween(block, "title") || "";
              const sourceRaw = extractBetween(block, "source") || "Unknown";
              const pubRaw = extractBetween(block, "pubDate") || new Date().toUTCString();
              const descRaw = extractBetween(block, "description") || "";
              const link = resolveArticleUrl(stripHtml(linkRaw));
              const title = stripHtml(titleRaw).replace(/\s*-\s*Google News$/i, "");
              const source = stripHtml(sourceRaw).replace(/\s*-\s*Google News$/i, "");
              const description = stripHtml(descRaw);
              const published = new Date(pubRaw).toISOString();
              if (link) items.push({ link, source, published, description, title });
            }
            return items;
          })();
          const limited = rssItems.slice(0, 8);
          for (const it of limited) {
            try {
              const { title: fetchedTitle, text } = await (async () => {
                async function fetchHtmlWithFinalUrl(target: string): Promise<{ html: string | null; finalUrl: string }> {
                  try {
                    const res = await fetch(target, { redirect: 'follow' });
                    if (!res.ok) return { html: null, finalUrl: target };
                    const text = await res.text();
                    return { html: text, finalUrl: res.url || target };
                  } catch {
                    return { html: null, finalUrl: target };
                  }
                }
                let { html, finalUrl } = await fetchHtmlWithFinalUrl(it.link);
                if (!html) return { title: null, text: null };
                try {
                  const hostname = new URL(finalUrl).hostname;
                  const isGoogleNews = /(^|\\.)news\\.google\\.com$/i.test(hostname) || html.includes('Comprehensive, up-to-date news coverage');
                  if (isGoogleNews) {
                    const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
                    const canonical = canonicalMatch ? canonicalMatch[1] : extractMetaContent(html, 'property', 'og:url');
                    if (canonical && !/news\\.google\\.com/i.test(canonical)) {
                      const refetched = await fetchHtmlWithFinalUrl(canonical);
                      if (refetched.html) {
                        html = refetched.html;
                        finalUrl = refetched.finalUrl;
                      }
                    }
                  }
                } catch {}
                const title = extractTitle(html);
                const text = extractMainText(html);
                return { title, text };
              })();
              const chosenTitle = stripSourceSuffix(it.title, it.source) || fetchedTitle || '';
              const content_snippet = cleanSnippet(chosenTitle).slice(0, 200);
              const full_text = text || it.description;
              allMentions.push({
                user_id: kw.user_id,
                keyword_id: kw.id,
                source_url: it.link,
                source_name: it.source || 'Unknown',
                published_at: it.published,
                content_snippet,
                full_text,
                source_type: 'news',
              });
            } catch (innerErr) {
              console.log('Article parse failed', { url: it.link, error: String(innerErr) });
            }
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
