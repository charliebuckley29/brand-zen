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

async function fetchGoogleCSE(query: string, limit = 5): Promise<{ title: string; link: string; snippet: string; pagemap?: any }[]> {
  const key = Deno.env.get("GOOGLE_CSE_API_KEY");
  const cx = Deno.env.get("GOOGLE_CSE_CX");
  if (!key || !cx) return [];
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(Math.min(limit, 10)));
  url.searchParams.set("key", key);
  url.searchParams.set("cx", cx);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
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

    // Fetch user-specific exclusions to avoid inserting "not me" items again
    const { data: exclusionsData, error: exclErr } = await supabase
      .from("mention_exclusions")
      .select("keyword_id, source_url")
      .eq("user_id", user.id);
    if (exclErr) throw exclErr;

    const exclusionsByKeyword = new Map<string, Set<string>>();
    for (const ex of exclusionsData || []) {
      const set = exclusionsByKeyword.get(ex.keyword_id) || new Set<string>();
      set.add(ex.source_url);
      exclusionsByKeyword.set(ex.keyword_id, set);
    }

    const perSourceLimit = 5;
    const createdUrls = new Set<string>();
    const mentionsToUpsert: MentionInput[] = [];
    const perSourceCounts: Record<string, number> = { web: 0, news: 0, reddit: 0, youtube: 0 };

    const enabled = {
      cse: Boolean(Deno.env.get("GOOGLE_CSE_API_KEY") && Deno.env.get("GOOGLE_CSE_CX")),
      gnews: Boolean(Deno.env.get("GNEWS_API_KEY")),
      reddit: Boolean(Deno.env.get("REDDIT_CLIENT_ID") && Deno.env.get("REDDIT_CLIENT_SECRET")),
      youtube: Boolean(Deno.env.get("YOUTUBE_API_KEY")),
    };
    console.log("aggregate-sources config:", { enabled, keywordCount: keywords.length });

    for (const kw of keywords) {
      const terms = unique([kw.brand_name, ...(kw.variants || [])]).filter(Boolean).slice(0, 5);

      for (const term of terms) {
        // Google CSE Web
        const web = await fetchGoogleCSE(term, perSourceLimit);
        for (const w of web) {
          const url = w.link;
          if (!url) continue;
          if (exclusionsByKeyword.get(kw.id)?.has(url)) continue;
          const key = `${kw.user_id}|${url}`;
          if (createdUrls.has(key)) continue;
          createdUrls.add(key);
          mentionsToUpsert.push({
            keyword_id: kw.id,
            user_id: kw.user_id,
            source_name: new URL(url).hostname.replace(/^www\./, ""),
            source_url: url,
            published_at: iso(),
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
