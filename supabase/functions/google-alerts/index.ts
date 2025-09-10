// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface GoogleAlertItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source?: string;
}

async function fetchGoogleAlertsRSS(rssUrl: string): Promise<GoogleAlertItem[]> {
  try {
    console.log(`🔔 Fetching Google Alerts RSS from: ${rssUrl}`);
    
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandProtected/1.0)'
      }
    });

    if (!response.ok) {
      console.error(`RSS fetch failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const rssText = await response.text();
    console.log(`📝 RSS content length: ${rssText.length} characters`);

    // Parse RSS XML (Google Alerts uses a specific format)
    const items: GoogleAlertItem[] = [];
    
    // Google Alerts RSS often uses <entry> tags instead of <item>
    let itemMatches = rssText.match(/<item[^>]*>[\s\S]*?<\/item>/gi);
    if (!itemMatches) {
      itemMatches = rssText.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi);
    }
    
    // Also try parsing as Atom feed entries
    if (!itemMatches) {
      // Google Alerts sometimes uses a different format - try to extract from the raw content
      console.log('📝 Trying alternative parsing for Google Alerts format...');
      
      // Look for URL patterns in the content
      const urlPattern = /https:\/\/www\.google\.com\/url\?[^"'\s]+/g;
      const urls = rssText.match(urlPattern);
      
      // Look for title patterns
      const titlePattern = /<b>(.*?)<\/b>/g;
      const titles = [];
      let match;
      while ((match = titlePattern.exec(rssText)) !== null) {
        titles.push(match[1]);
      }
      
      if (urls && urls.length > 0) {
        console.log(`📰 Found ${urls.length} URLs in alternative format`);
        for (let i = 0; i < Math.min(urls.length, titles.length); i++) {
          items.push({
            title: titles[i] || 'Google Alert Item',
            link: urls[i],
            description: titles[i] || '',
            pubDate: new Date().toISOString()
          });
        }
        return items;
      }
    }
    
    if (!itemMatches) {
      console.log('⚠️ No RSS items found in response - trying raw content extraction...');
      console.log(`📝 Sample content: ${rssText.substring(0, 500)}`);
      return [];
    }

    console.log(`📰 Found ${itemMatches.length} RSS items`);

    for (const itemXml of itemMatches) {
      try {
        const title = itemXml.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>/i)?.[1] || 
                     itemXml.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || '';
        
        const link = itemXml.match(/<link[^>]*>(.*?)<\/link>/i)?.[1] || '';
        
        const description = itemXml.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>/i)?.[1] || 
                           itemXml.match(/<description[^>]*>(.*?)<\/description>/i)?.[1] || '';
        
        const pubDate = itemXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i)?.[1] || 
                       itemXml.match(/<dc:date[^>]*>(.*?)<\/dc:date>/i)?.[1] || 
                       new Date().toISOString();

        if (title && link) {
          // Extract source from Google Alerts link
          const sourceMatch = link.match(/url=([^&]+)/);
          const actualUrl = sourceMatch ? decodeURIComponent(sourceMatch[1]) : link;
          const sourceName = actualUrl ? new URL(actualUrl).hostname.replace(/^www\./, '') : 'unknown';

          items.push({
            title: title.trim(),
            link: actualUrl,
            description: description.trim(),
            pubDate,
            source: sourceName
          });
        }
      } catch (parseError) {
        console.error('Error parsing RSS item:', parseError);
      }
    }

    console.log(`✅ Successfully parsed ${items.length} Google Alerts items`);
    return items;
  } catch (error) {
    console.error('Error fetching Google Alerts RSS:', error);
    return [];
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    });

    console.log('🔔 Starting Google Alerts RSS fetch...');

    // Get all keywords with Google Alerts RSS URLs
    const { data: keywords, error: keywordsError } = await supabase
      .from('keywords')
      .select('id, user_id, brand_name, google_alert_rss_url')
      .not('google_alert_rss_url', 'is', null)
      .eq('google_alerts_enabled', true);

    if (keywordsError) {
      console.error('Error fetching keywords:', keywordsError);
      throw keywordsError;
    }

    if (!keywords || keywords.length === 0) {
      console.log('📭 No keywords with Google Alerts RSS URLs found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No Google Alerts RSS URLs configured',
        processed: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📋 Processing ${keywords.length} keywords with Google Alerts`);

    let totalMentions = 0;
    const results = [];

    // Get exclusions for deduplication
    const { data: exclusions } = await supabase
      .from('mention_exclusions')
      .select('keyword_id, source_url');

    const exclusionsByKeyword = new Map();
    exclusions?.forEach(ex => {
      if (!exclusionsByKeyword.has(ex.keyword_id)) {
        exclusionsByKeyword.set(ex.keyword_id, new Set());
      }
      exclusionsByKeyword.get(ex.keyword_id).add(ex.source_url);
    });

    for (const keyword of keywords) {
      try {
        console.log(`🔍 Processing Google Alerts for: ${keyword.brand_name}`);
        
        const alertItems = await fetchGoogleAlertsRSS(keyword.google_alert_rss_url);
        const mentionsToInsert = [];

        for (const item of alertItems) {
          // Skip if excluded
          if (exclusionsByKeyword.get(keyword.id)?.has(item.link)) {
            continue;
          }

          // Check if mention already exists
          const { data: existing } = await supabase
            .from('mentions')
            .select('id')
            .eq('user_id', keyword.user_id)
            .eq('source_url', item.link)
            .limit(1);

          if (existing && existing.length > 0) {
            continue; // Skip duplicates
          }

          // Check for brand name mismatch (indicating moderator assignment)
          const contentLower = (item.title + ' ' + item.description).toLowerCase();
          const brandLower = keyword.brand_name.toLowerCase();
          const isBrandMismatch = !contentLower.includes(brandLower) && 
                                 !brandLower.includes(contentLower.split(' ')[0]);

          let internalNote = '';
          if (isBrandMismatch) {
            internalNote = `Note: This Google Alert RSS feed appears to be for different content than the keyword "${keyword.brand_name}". This may have been assigned by a moderator for monitoring purposes.`;
          }

          mentionsToInsert.push({
            keyword_id: keyword.id,
            user_id: keyword.user_id,
            source_name: `Google Alerts${isBrandMismatch ? ' (Moderator Assigned)' : ''}`,
            source_url: item.link,
            published_at: new Date(item.pubDate).toISOString(),
            content_snippet: item.description || item.title,
            full_text: `${item.title}\n\n${item.description}`.trim(),
            source_type: 'google_alert',
            flagged: isBrandMismatch, // Flag mismatched content for review
            sentiment: null,
            escalation_type: 'none',
            internal_notes: internalNote
          });
        }

        if (mentionsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('mentions')
            .insert(mentionsToInsert);

          if (insertError) {
            console.error(`Error inserting mentions for ${keyword.brand_name}:`, insertError);
            results.push({
              keyword: keyword.brand_name,
              success: false,
              error: insertError.message,
              mentions_found: alertItems.length,
              mentions_inserted: 0
            });
          } else {
            console.log(`✅ Inserted ${mentionsToInsert.length} mentions for ${keyword.brand_name}`);
            totalMentions += mentionsToInsert.length;
            results.push({
              keyword: keyword.brand_name,
              success: true,
              mentions_found: alertItems.length,
              mentions_inserted: mentionsToInsert.length
            });
          }
        } else {
          console.log(`📭 No new mentions found for ${keyword.brand_name}`);
          results.push({
            keyword: keyword.brand_name,
            success: true,
            mentions_found: alertItems.length,
            mentions_inserted: 0
          });
        }
      } catch (error) {
        console.error(`Error processing Google Alerts for ${keyword.brand_name}:`, error);
        results.push({
          keyword: keyword.brand_name,
          success: false,
          error: error.message,
          mentions_found: 0,
          mentions_inserted: 0
        });
      }
    }

    console.log(`🎉 Google Alerts fetch completed: ${totalMentions} total mentions inserted`);

    return new Response(JSON.stringify({
      success: true,
      keywords_processed: keywords.length,
      total_mentions_inserted: totalMentions,
      results,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Google Alerts fetch error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});