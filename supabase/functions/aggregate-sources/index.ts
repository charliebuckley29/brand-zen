import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
// Utility function to get API keys from database
async function getApiKeys(adminClient) {
  const { data: apiKeys, error } = await adminClient.from("api_keys").select("source_name, api_key, additional_config, is_active").eq("is_active", true);
  if (error) {
    console.error("Error fetching API keys:", error);
    return new Map();
  }
  const keyMap = new Map();
  for (const key of apiKeys || []){
    keyMap.set(key.source_name, key);
  }
  return keyMap;
}
function iso(date) {
  try {
    return new Date(date || Date.now()).toISOString();
  } catch  {
    return new Date().toISOString();
  }
}
function unique(arr) {
  return Array.from(new Set(arr));
}
async function fetchGoogleCSE(query, limit = 5, apiKeys) {
  const keyData = apiKeys.get("google_cse");
  if (!keyData?.api_key || !keyData?.additional_config?.cx_id) {
    // Fallback to environment variables if not in database
    const key = keyData?.api_key || Deno.env.get("GOOGLE_CSE_API_KEY");
    const cx = keyData?.additional_config?.cx_id || Deno.env.get("GOOGLE_CSE_CX");
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
  const key = keyData.api_key === 'configured_in_secrets' ? Deno.env.get("GOOGLE_CSE_API_KEY") : keyData.api_key;
  const cx = keyData.additional_config.cx_id === 'configured_in_secrets' ? Deno.env.get("GOOGLE_CSE_CX") : keyData.additional_config.cx_id;
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
async function fetchGNews(query, limit = 5, apiKeys) {
  const keyData = apiKeys.get("gnews");
  if (!keyData?.api_key) {
    // Fallback to environment variables
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
  const key = keyData.api_key === 'configured_in_secrets' ? Deno.env.get("GNEWS_API_KEY") : keyData.api_key;
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
async function fetchReddit(query, limit = 5, apiKeys) {
  const keyData = apiKeys.get("reddit");
  if (!keyData?.api_key || !keyData?.additional_config?.client_secret) {
    // Fallback to environment variables
    const clientId = Deno.env.get("REDDIT_CLIENT_ID");
    const clientSecret = Deno.env.get("REDDIT_CLIENT_SECRET");
    if (!clientId || !clientSecret) return [];
    const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
        "User-Agent": "brand-protected/1.0 by lovable"
      },
      body: new URLSearchParams({
        grant_type: "client_credentials"
      })
    });
    if (!tokenRes.ok) return [];
    const token = await tokenRes.json();
    const searchUrl = new URL("https://oauth.reddit.com/search");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("limit", String(limit));
    searchUrl.searchParams.set("sort", "new");
    const res = await fetch(searchUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "User-Agent": "brand-protected/1.0 by lovable"
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const posts = data.data?.children || [];
    return posts.map((p)=>({
        title: p.data.title,
        url: `https://www.reddit.com${p.data.permalink}`,
        selftext: p.data.selftext,
        created_utc: p.data.created_utc,
        subreddit: p.data.subreddit
      }));
  }
  const clientId = keyData.api_key === 'configured_in_secrets' ? Deno.env.get("REDDIT_CLIENT_ID") : keyData.api_key;
  const clientSecret = keyData.additional_config.client_secret === 'configured_in_secrets' ? Deno.env.get("REDDIT_CLIENT_SECRET") : keyData.additional_config.client_secret;
  if (!clientId || !clientSecret) return [];
  const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
      "User-Agent": "brand-protected/1.0 by lovable"
    },
    body: new URLSearchParams({
      grant_type: "client_credentials"
    })
  });
  if (!tokenRes.ok) return [];
  const token = await tokenRes.json();
  const searchUrl = new URL("https://oauth.reddit.com/search");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("limit", String(limit));
  searchUrl.searchParams.set("sort", "new");
  const res = await fetch(searchUrl.toString(), {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "User-Agent": "brand-protected/1.0 by lovable"
    }
  });
  if (!res.ok) return [];
  const data = await res.json();
  const posts = data.data?.children || [];
  return posts.map((p)=>({
      title: p.data.title,
      url: `https://www.reddit.com${p.data.permalink}`,
      selftext: p.data.selftext,
      created_utc: p.data.created_utc,
      subreddit: p.data.subreddit
    }));
}
async function fetchYouTube(query, limit = 5, apiKeys) {
  const keyData = apiKeys.get("youtube");
  if (!keyData?.api_key) {
    // Fallback to environment variables
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
    return items.map((it)=>({
        title: it.snippet?.title,
        url: `https://www.youtube.com/watch?v=${it.id?.videoId}`,
        description: it.snippet?.description,
        publishedAt: it.snippet?.publishedAt,
        channelTitle: it.snippet?.channelTitle
      }));
  }
  const key = keyData.api_key === 'configured_in_secrets' ? Deno.env.get("YOUTUBE_API_KEY") : keyData.api_key;
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
  return items.map((it)=>({
      title: it.snippet?.title,
      url: `https://www.youtube.com/watch?v=${it.id?.videoId}`,
      description: it.snippet?.description,
      publishedAt: it.snippet?.publishedAt,
      channelTitle: it.snippet?.channelTitle
    }));
}
async function fetchXTwitter(query, limit = 5, apiKeys) {
  const keyData = apiKeys.get("x_twitter");
  if (!keyData?.api_key && !keyData?.additional_config?.bearer_token) {
    return []; // No X/Twitter API support without keys
  }
  const bearerToken = keyData?.additional_config?.bearer_token === 'configured_in_secrets' ? Deno.env.get("X_BEARER_TOKEN") : keyData?.additional_config?.bearer_token;
  if (!bearerToken) return [];
  try {
    const url = new URL("https://api.twitter.com/2/tweets/search/recent");
    url.searchParams.set("query", query);
    url.searchParams.set("max_results", String(Math.min(limit, 10)));
    url.searchParams.set("tweet.fields", "created_at,author_id,public_metrics");
    const res = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const tweets = data.data || [];
    return tweets.map((tweet)=>({
        id: tweet.id,
        text: tweet.text,
        url: `https://twitter.com/i/status/${tweet.id}`,
        created_at: tweet.created_at,
        author_id: tweet.author_id,
        public_metrics: tweet.public_metrics
      }));
  } catch (error) {
    console.error("X/Twitter API error:", error);
    return [];
  }
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const body = await req.json().catch(()=>({}));
    const { keywordId } = body || {};
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization") || "";
    const isServiceRole = authHeader.includes(serviceKey);
    const hasJwt = authHeader.startsWith("Bearer ") && !authHeader.includes(anonKey) && !isServiceRole;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    const adminClient = createClient(supabaseUrl, serviceKey);
    const db = hasJwt ? userClient : adminClient;
    // Get API keys from database
    const apiKeys = await getApiKeys(adminClient);
    // Determine current user (if any)
    let userId = null;
    if (hasJwt) {
      const { data: userData } = await userClient.auth.getUser();
      userId = userData?.user?.id ?? null;
      if (!userId) return new Response(JSON.stringify({
        error: "Not authenticated"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Get keywords (for one user or everyone when admin)
    let keywords: any[] = [];
    if (hasJwt) {
      if (keywordId) {
        const { data, error } = await db.from("keywords").select("id, user_id, brand_name, variants").eq("id", keywordId).eq("user_id", userId).maybeSingle();
        if (error) throw error;
        if (data) keywords = [
          data
        ];
      } else {
        const { data, error } = await db.from("keywords").select("id, user_id, brand_name, variants").eq("user_id", userId);
        if (error) throw error;
        keywords = data || [];
      }
    } else {
      // Service role - can access all keywords
      if (keywordId) {
        const { data, error } = await db.from("keywords").select("id, user_id, brand_name, variants").eq("id", keywordId).maybeSingle();
        if (error) throw error;
        if (data) keywords = [data];
      } else {
        const { data, error } = await db.from("keywords").select("id, user_id, brand_name, variants");
        if (error) throw error;
        keywords = data || [];
      }
    }
    if (!keywords.length) {
      return new Response(JSON.stringify({
        message: "No keywords configured"
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Fetch source preferences
    const userIds = unique(keywords.map((k)=>k.user_id));
    const prefsByUser = new Map();
    if (userIds.length) {
      const { data: prefRows, error: prefErr } = await db.from("source_preferences").select("user_id, source_type, show_in_mentions").in("user_id", userIds);
      if (prefErr) throw prefErr;
      for (const u of userIds)prefsByUser.set(u, {});
      for (const row of prefRows || []){
        const m = prefsByUser.get(row.user_id) || {};
        m[row.source_type] = row.show_in_mentions !== false; // default true
        prefsByUser.set(row.user_id, m);
      }
    }
    function isEnabledFor(user_id, source) {
      const m = prefsByUser.get(user_id);
      if (!m || m[source] === undefined) return true; // default enabled
      return m[source];
    }
    // Fetch exclusions
    const { data: exclRows, error: exclErr } = await db.from("mention_exclusions").select("keyword_id, source_url");
    if (exclErr) throw exclErr;
    const exclusionsByKeyword = new Map();
    for (const ex of exclRows || []){
      const set = exclusionsByKeyword.get(ex.keyword_id) || new Set();
      set.add(ex.source_url);
      exclusionsByKeyword.set(ex.keyword_id, set);
    }
    // Environment availability per source (now from database)
    const envEnabled = {
      web: apiKeys.has("google_cse") && apiKeys.get("google_cse")?.is_active,
      news: apiKeys.has("gnews") && apiKeys.get("gnews")?.is_active,
      reddit: apiKeys.has("reddit") && apiKeys.get("reddit")?.is_active,
      youtube: apiKeys.has("youtube") && apiKeys.get("youtube")?.is_active,
      x: apiKeys.has("x_twitter") && apiKeys.get("x_twitter")?.is_active
    };
    const perSourceLimit = 5;
    const createdUrls = new Set();
    const mentionsToUpsert = [];
    const perSourceCounts = {
      web: 0,
      news: 0,
      reddit: 0,
      youtube: 0,
      x: 0
    };
    for (const kw of keywords){
      const terms = unique([
        kw.brand_name,
        ...kw.variants || []
      ]).filter(Boolean).slice(0, 5);
      const allow = {
        web: envEnabled.web && isEnabledFor(kw.user_id, "web"),
        news: envEnabled.news && isEnabledFor(kw.user_id, "news"),
        reddit: envEnabled.reddit && isEnabledFor(kw.user_id, "reddit"),
        youtube: envEnabled.youtube && isEnabledFor(kw.user_id, "youtube"),
        x: envEnabled.x && isEnabledFor(kw.user_id, "x")
      };
      for (const term of terms){
        if (allow.web) {
          const web = await fetchGoogleCSE(term, perSourceLimit, apiKeys);
          for (const w of web){
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
              escalation_type: null,
              sentiment: null,
              cleaned_text: null,
              model_used: null,
              summary: null,
              internal_notes: null,
              topics: null,
              full_text: w.snippet || term
            });
            perSourceCounts.web++;
          }
        }
        if (allow.news) {
          const news = await fetchGNews(term, perSourceLimit, apiKeys);
          for (const n of news){
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
              escalation_type: null,
              sentiment: null,
              cleaned_text: null,
              model_used: null,
              summary: null,
              internal_notes: null,
              topics: null,
              full_text: n.description || n.title || term
            });
            perSourceCounts.news++;
          }
        }
        if (allow.reddit) {
          const reddits = await fetchReddit(term, perSourceLimit, apiKeys);
          for (const r of reddits){
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
              escalation_type: null,
              sentiment: null,
              cleaned_text: null,
              model_used: null,
              summary: null,
              internal_notes: null,
              topics: null,
              full_text: r.selftext || r.title || term
            });
            perSourceCounts.reddit++;
          }
        }
        if (allow.youtube) {
          const videos = await fetchYouTube(term, perSourceLimit, apiKeys);
          for (const v of videos){
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
              escalation_type: null,
              sentiment: null,
              cleaned_text: null,
              model_used: null,
              summary: null,
              internal_notes: null,
              topics: null,
              full_text: v.description || v.title || term
            });
            perSourceCounts.youtube++;
          }
        }
        if (allow.x) {
          const tweets = await fetchXTwitter(term, perSourceLimit, apiKeys);
          for (const t of tweets){
            const url = t.url;
            if (!url) continue;
            const key = `${kw.user_id}|${url}`;
            if (createdUrls.has(key)) continue;
            createdUrls.add(key);
            mentionsToUpsert.push({
              keyword_id: kw.id,
              user_id: kw.user_id,
              source_name: "X (Twitter)",
              source_url: url,
              published_at: iso(t.created_at),
              content_snippet: t.text || term,
              source_type: "x",
              flagged: false,
              escalation_type: null,
              sentiment: null,
              cleaned_text: null,
              model_used: null,
              summary: null,
              internal_notes: null,
              topics: null,
              full_text: t.text || term
            });
            perSourceCounts.x++;
          }
        }
      }
    }
    let upserted = 0;
    if (mentionsToUpsert.length) {
      const chunkSize = 500;
      for(let i = 0; i < mentionsToUpsert.length; i += chunkSize){
        const chunk = mentionsToUpsert.slice(i, i + chunkSize);
        const { error, count } = await db.from("mentions").upsert(chunk, {
          onConflict: "user_id,source_url",
          ignoreDuplicates: true,
          count: "exact"
        });
        if (error) {
          console.error("Upsert error:", error);
        } else {
          upserted += count || 0;
        }
      }
    }
    const bodyOut = {
      inserted: upserted,
      totalPrepared: mentionsToUpsert.length,
      perSource: perSourceCounts
    };
    return new Response(JSON.stringify(bodyOut), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    console.error("aggregate-sources error:", e);
    return new Response(JSON.stringify({
      error: String(e)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
