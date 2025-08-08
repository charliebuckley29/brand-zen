import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMetaContent(html: string, attr: 'property' | 'name', key: string): string | null {
  const regex = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

function extractTitle(html: string): string | null {
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

function isGoogleNewsUrl(u: string): boolean {
  try {
    const h = new URL(u).hostname;
    return /(^|\.)news\.google\.com$/i.test(h);
  } catch { return false; }
}

function firstExternalLink(html: string): string | null {
  const links = Array.from(html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi))
    .map(m => m[1]);
  for (const l of links) {
    try {
      const host = new URL(l).hostname;
      if (!/news\.google\.com$/i.test(host) && !/accounts\.google\.com$/i.test(host) && !/google\.com$/i.test(host)) {
        return l;
      }
    } catch {}
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, mentionId } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing url' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 1: fetch initial and follow redirects
    let { html, finalUrl } = await fetchHtmlWithFinalUrl(url);
    if (!html) {
      return new Response(JSON.stringify({ title: null, text: null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 2: if finalUrl contains ?url= param (Google redirect), use it
    try {
      const u = new URL(finalUrl);
      const urlParam = u.searchParams.get('url');
      if (urlParam) {
        const ref = await fetchHtmlWithFinalUrl(decodeURIComponent(urlParam));
        if (ref.html) { html = ref.html; finalUrl = ref.finalUrl; }
      }
    } catch {}

    // Step 3: if still a Google News page or generic tagline, try canonical/og:url
    const genericTagline = 'Comprehensive, up-to-date news coverage';
    if (isGoogleNewsUrl(finalUrl) || html.includes(genericTagline)) {
      const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
      const canonical = canonicalMatch ? canonicalMatch[1] : (extractMetaContent(html, 'property', 'og:url') || extractMetaContent(html, 'name', 'twitter:url'));
      if (canonical && !isGoogleNewsUrl(canonical)) {
        const ref = await fetchHtmlWithFinalUrl(canonical);
        if (ref.html) { html = ref.html; finalUrl = ref.finalUrl; }
      } else {
        const ext = firstExternalLink(html);
        if (ext) {
          const ref = await fetchHtmlWithFinalUrl(ext);
          if (ref.html) { html = ref.html; finalUrl = ref.finalUrl; }
        }
      }
    }

    const title = extractTitle(html);
    let text = extractMainText(html);
    if (text && text.includes(genericTagline)) text = null;

    // Optionally persist full_text if mentionId provided and we have JWT
    try {
      const authHeader = req.headers.get('Authorization') || '';
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
      if (mentionId && text && supabaseUrl && anonKey && authHeader.startsWith('Bearer ')) {
        const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
        await client.from('mentions').update({ full_text: text }).eq('id', mentionId);
      }
    } catch (e) {
      console.log('Persist full_text failed:', String(e));
    }

    return new Response(JSON.stringify({ title, text, finalUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('resolve-article error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
