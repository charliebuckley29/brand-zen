import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RSSItem {
  title: string
  link: string
  pubDate: string
  description: string
}

async function parseRSS(rssUrl: string): Promise<RSSItem[]> {
  try {
    console.log(`Fetching RSS from: ${rssUrl}`)
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader)'
      }
    })
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`)
      return []
    }
    
    const rssText = await response.text()
    console.log(`RSS response length: ${rssText.length}`)
    console.log(`First 500 chars: ${rssText.substring(0, 500)}`)
    
    const items: RSSItem[] = []
    
    // Check if it's an Atom feed (Google Alerts format)
    if (rssText.includes('<entry>') || rssText.includes('<entry ')) {
      console.log('Detected Atom feed format')
      const entryMatches = rssText.match(/<entry[^>]*>[\s\S]*?<\/entry>/g) || []
      console.log(`Found ${entryMatches.length} entries in Atom feed`)
      
      for (const entryXml of entryMatches) {
        console.log(`Processing entry: ${entryXml.substring(0, 200)}...`)
        
        let title = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.trim() || ''
        title = title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').trim()
        
        // Multiple ways to extract link from Atom feeds
        let link = ''
        // Try href attribute first
        const hrefMatch = entryXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/)
        if (hrefMatch) {
          link = hrefMatch[1]
        } else {
          // Try link content
          const linkMatch = entryXml.match(/<link[^>]*>([\s\S]*?)<\/link>/)
          if (linkMatch) {
            link = linkMatch[1].trim()
          }
        }
        
        let pubDate = entryXml.match(/<published[^>]*>([\s\S]*?)<\/published>/)?.[1]?.trim() || 
                      entryXml.match(/<updated[^>]*>([\s\S]*?)<\/updated>/)?.[1]?.trim() || ''
        
        let description = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1]?.trim() || 
                         entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1]?.trim() || ''
        description = description.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').trim()
        
        console.log(`Extracted - Title: "${title}", Link: "${link}"`)
        
        if (title && link) {
          items.push({
            title,
            link: link.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1'),
            pubDate,
            description
          })
        }
      }
    } else if (rssText.includes('<item>') || rssText.includes('<item ')) {
      // Standard RSS format
      console.log('Detected RSS feed format')
      const itemMatches = rssText.match(/<item[^>]*>[\s\S]*?<\/item>/g) || []
      console.log(`Found ${itemMatches.length} items in RSS feed`)
      
      for (const itemXml of itemMatches) {
        const title = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.trim() || ''
        const link = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1]?.trim() || ''
        const pubDate = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || ''
        const description = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/)?.[1]?.trim() || ''
        
        if (title && link) {
          items.push({
            title: title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1'),
            link: link.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1'),
            pubDate,
            description: description.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '')
          })
        }
      }
    } else {
      console.log('No recognized feed format found (no <entry> or <item> tags)')
    }
    
    console.log(`Parsed ${items.length} total items from feed`)
    return items
  } catch (error) {
    console.error('RSS parsing error:', error)
    return []
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from JWT
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        },
      )
    }

    console.log('Fetching Google Alerts for user:', user.id)

    // Get user's keywords that have Google Alert RSS URLs
    const { data: keywords, error: keywordsError } = await supabaseClient
      .from('keywords')
      .select('id, brand_name, google_alert_rss_url')
      .eq('user_id', user.id)
      .not('google_alert_rss_url', 'is', null)

    if (keywordsError) {
      console.error('Keywords error:', keywordsError)
      throw keywordsError
    }

    if (!keywords || keywords.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No Google Alert RSS URLs found', processed: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    console.log(`Processing ${keywords.length} keywords with RSS URLs`)

    let totalProcessed = 0
    const newMentions: any[] = []

    for (const keyword of keywords) {
      console.log(`Processing RSS for keyword: ${keyword.brand_name}`)
      
      const rssItems = await parseRSS(keyword.google_alert_rss_url)
      console.log(`Found ${rssItems.length} RSS items for ${keyword.brand_name}`)

      for (const item of rssItems) {
        // Check if this mention already exists
        const { data: existing } = await supabaseClient
          .from('mentions')
          .select('id')
          .eq('user_id', user.id)
          .eq('keyword_id', keyword.id)
          .eq('source_url', item.link)
          .maybeSingle()

        if (existing) {
          continue // Skip if already exists
        }

        // Parse pub date
        let publishedAt = new Date()
        if (item.pubDate) {
          try {
            publishedAt = new Date(item.pubDate)
          } catch {
            publishedAt = new Date()
          }
        }

        const mention = {
          user_id: user.id,
          keyword_id: keyword.id,
          source_name: 'Google Alerts',
          source_url: item.link,
          source_type: 'google_alert',
          content_snippet: item.description.substring(0, 500),
          full_text: item.description,
          published_at: publishedAt.toISOString(),
          sentiment: null,
          escalation_type: null,
          flagged: false,
          cleaned_text: null,
          model_used: null,
          summary: null,
          internal_notes: null,
          topics: null,
        }

        newMentions.push(mention)
        totalProcessed++
      }
    }

    // Batch insert new mentions
    if (newMentions.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('mentions')
        .insert(newMentions)

      if (insertError) {
        console.error('Insert error:', insertError)
        throw insertError
      }
    }

    console.log(`Successfully processed ${totalProcessed} new mentions`)

    return new Response(
      JSON.stringify({
        message: 'Google Alerts processed successfully',
        processed: totalProcessed,
        keywords_checked: keywords.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Google Alerts error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})