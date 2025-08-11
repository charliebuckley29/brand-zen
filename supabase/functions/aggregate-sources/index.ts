// Aggregate multi-source mentions for a user's keywords
// Sources: Bing Web, GNews, Reddit, YouTube (skip any without secrets)
// Upserts into public.mentions with dedupe on (user_id, source_url)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Keyword = { id: string; user_id: string; brand_name: string; variants: string[] | null };

type MentionInput = {
  keyword_id: string;
  user_id: string;
  source_name: string;
  source_url: string;
  published_at: string;
  content_snippet: string;
  source_type: "web" | "news" | "reddit" | "youtube" | "rss";
  flagged?: boolean;
  escalation_type?: string;
};

function iso(date?: string | number | Date) {
  try {
    return new Date(date || Date.now()).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

async function fetchBingWeb(query: string, limit = 5): Promise<{ name: string; url: string; snippet: string; datePublished?: string; hostPageUrl?: string }[]> {
  const key = Deno.env.get("BING_SEARCH_API_KEY");
  if (!key) return [];
  const url = new URL("https://api.bing.microsoft.com/v7.0/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(limit));
  const res = await fetch(url.toString(), { headers: { "Ocp-Apim-Subscription-Key": key } });
  if (!res.ok) return [];
  const data = await res.json();
  const web = data.webPages?.value || [];
  return web.map((w: any) => ({ name: w.name, url: w.url, snippet: w.snippet, datePublished: w.dateLastCrawled }));
}

async function fetchGNews(query: string, limit = 5): Promise<{ title: string; url: string; description: string; publishedAt?: string; source?: { name?: string } }[]> {
  const key = Deno.env.get("GNEWS_API_KEY");
  if (!key) return [];
  const url = new URL("https://gnews.io/api/v4/search");
  url.searchParams.set("q", query);
  url.searchParams.set("lang", "en");
  url.searchParams.set("max", String(limit));
  url.searchParams.set("apikey", key);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return data.articles || [];
}

async function fetchReddit(query: string, limit = 5): Promise<{ title: string; url: string; selftext?: string; created_utc?: number; subreddit?: string }[]> {
  const clientId = Deno.env.get("REDDIT_CLIENT_ID");
  const clientSecret = Deno.env.get("REDDIT_CLIENT_SECRET");
  if (!clientId || !clientSecret) return [];

  const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  if (!tokenRes.ok) return [];
  const token = await tokenRes.json();

  const searchUrl = new URL("https://oauth.reddit.com/search");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("limit", String(limit));
  searchUrl.searchParams.set("sort", "new");
  const res = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const posts = data.data?.children || [];
  return posts.map((p: any) => ({
    title: p.data.title,
    url: `https://www.reddit.com${p.data.permalink}`,
    selftext: p.data.selftext,
    created_utc: p.data.created_utc,
    subreddit: p.data.subreddit,
  }));
}

async function fetchYouTube(query: string, limit = 5): Promise<{ title: string; url: string; description?: string; publishedAt?: string; channelTitle?: string }[]> {
  const key = Deno.env.get("YOUTUBE_API_KEY");
  if (!key) return [];
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(limit));
  url.searchParams.set("key", key);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  const items = data.items || [];
  return items.map((it: any) => ({
    title: it.snippet?.title,
    url: `https://www.youtube.com/watch?v=${it.id?.videoId}`,
    description: it.snippet?.description,
    publishedAt: it.snippet?.publishedAt,
    channelTitle: it.snippet?.channelTitle,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { keywordId } = await req.json().catch(() => ({ }));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let keywords: Keyword[] = [];

    if (keywordId) {
      const { data, error } = await supabase
        .from("keywords")
        .select("id, user_id, brand_name, variants")
        .eq("id", keywordId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) keywords = [data];
    } else {
      const { data, error } = await supabase
        .from("keywords")
        .select("id, user_id, brand_name, variants")
        .eq("user_id", user.id);
      if (error) throw error;
      keywords = data || [];
    }

    if (!keywords.length) {
      return new Response(JSON.stringify({ message: "No keywords configured" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const perSourceLimit = 5;
    const createdUrls = new Set<string>();
    const mentionsToUpsert: MentionInput[] = [];
    const perSourceCounts: Record<string, number> = { web: 0, news: 0, reddit: 0, youtube: 0 };

    for (const kw of keywords) {
      const terms = unique([kw.brand_name, ...(kw.variants || [])]).filter(Boolean).slice(0, 5);

      for (const term of terms) {
        // Bing Web
        const web = await fetchBingWeb(term, perSourceLimit);
        for (const w of web) {
          const url = w.url || w.hostPageUrl;
          if (!url) continue;
          const key = `${kw.user_id}|${url}`;
          if (createdUrls.has(key)) continue;
          createdUrls.add(key);
          mentionsToUpsert.push({
            keyword_id: kw.id,
            user_id: kw.user_id,
            source_name: new URL(url).hostname.replace(/^www\./, ""),
            source_url: url,
            published_at: iso(w.datePublished),
            content_snippet: w.snippet || term,
            source_type: "web",
            flagged: false,
            escalation_type: "none",
          });
          perSourceCounts.web++;
        }

        // GNews
        const news = await fetchGNews(term, perSourceLimit);
        for (const n of news) {
          const url = n.url;
          if (!url) continue;
          const key = `${kw.user_id}|${url}`;
          if (createdUrls.has(key)) continue;
          createdUrls.add(key);
          mentionsToUpsert.push({
            keyword_id: kw.id,
            user_id: kw.user_id,
            source_name: n.source?.name || new URL(url).hostname.replace(/^www\./, ""),
            source_url: url,
            published_at: iso(n.publishedAt),
            content_snippet: n.description || n.title || term,
            source_type: "news",
            flagged: false,
            escalation_type: "none",
          });
          perSourceCounts.news++;
        }

        // Reddit
        const reddits = await fetchReddit(term, perSourceLimit);
        for (const r of reddits) {
          const url = r.url;
          if (!url) continue;
          const key = `${kw.user_id}|${url}`;
          if (createdUrls.has(key)) continue;
          createdUrls.add(key);
          mentionsToUpsert.push({
            keyword_id: kw.id,
            user_id: kw.user_id,
            source_name: r.subreddit ? `r/${r.subreddit}` : "reddit",
            source_url: url,
            published_at: iso((r.created_utc || 0) * 1000),
            content_snippet: r.selftext || r.title || term,
            source_type: "reddit",
            flagged: false,
            escalation_type: "none",
          });
          perSourceCounts.reddit++;
        }

        // YouTube
        const videos = await fetchYouTube(term, perSourceLimit);
        for (const v of videos) {
          const url = v.url;
          if (!url) continue;
          const key = `${kw.user_id}|${url}`;
          if (createdUrls.has(key)) continue;
          createdUrls.add(key);
          mentionsToUpsert.push({
            keyword_id: kw.id,
            user_id: kw.user_id,
            source_name: v.channelTitle || "YouTube",
            source_url: url,
            published_at: iso(v.publishedAt),
            content_snippet: v.description || v.title || term,
            source_type: "youtube",
            flagged: false,
            escalation_type: "none",
          });
          perSourceCounts.youtube++;
        }
      }
    }

    let upserted = 0;
    if (mentionsToUpsert.length) {
      // Chunk to avoid payload limits
      const chunkSize = 500;
      for (let i = 0; i < mentionsToUpsert.length; i += chunkSize) {
        const chunk = mentionsToUpsert.slice(i, i + chunkSize);
        const { error, count } = await supabase
          .from("mentions")
          .upsert(chunk, { onConflict: "user_id,source_url", ignoreDuplicates: true, count: "exact" });
        if (error) {
          console.error("Upsert error:", error);
          // Continue with next chunk
        } else {
          upserted += count || 0;
        }
      }
    }

    const body = { inserted: upserted, totalPrepared: mentionsToUpsert.length, perSource: perSourceCounts };
    return new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("aggregate-sources error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
