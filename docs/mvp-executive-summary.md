# Brand Monitoring MVP — Executive Summary (Plain English)

Purpose: Give a clear, non-technical view of what we have today, where we’re going, and what we need to get there.

—

1) What this should be
- A tool that watches the internet for mentions of brand, products, and competitors.
- It summarizes what people are saying (positive/negative/neutral) and alerts us quickly when something important happens.

—

2) Where we are today (Current MVP)

What it does now
- Front end UI and back end database set up
- User authorization implemented
- Tracks brand mentions mainly from online news sources (GNews)
- Shows mentions and trends in a simple dashboard.

What’s missing
- Uses AI to classify the tone (sentiment) of each mention.
- Can send alerts for negative mentions.
- Broader coverage beyond news (web pages, blogs, communities, video, reviews).
- Smarter filtering (less noise, fewer duplicates).
- Easier sharing (simple reports, Slack/email digests).

—

3) Where we’re going (Target vision)
- “Google Alerts–style” coverage: news, general web, Reddit/forums, YouTube, and key blogs.
- One place to see everything, with trends, top sources, and emerging topics.
- Timely alerts for important or risky mentions.
- Easy reports for leadership and teams.

What leaders will get
- A reliable early-warning system for brand risks.
- Clear weekly/monthly snapshots of brand health.
- Less manual searching, more proactive action.

—

4) How we’ll get there
Phase 1: Broaden sources
- Add more sources using proven APIs (web search, news, Reddit, YouTube, and RSS/blogs).
- Normalize all mentions into one consistent format.
- Improve the dashboard to show new sources and simple filters.
- Keep existing alerts, extend to new sources.

Phase 2: Improve quality and scale (outside of scope)
- Reduce duplicates; down-rank spammy sites.
- Better language handling and topic tags.
- Stronger error handling and logging so it’s reliable day-to-day.

Phase 3: Insights and workflow
- Highlights of what changed week-over-week; top risks and wins.
- Shareable reports; Slack/email digests; CSV/Sheets export.
- Light “assign/resolve” workflow for handling mentions.

—

5) Data sources we can use (in simple terms)
- Web search: Bing Web Search (broad coverage of websites).
- News: GNews (reliable news headlines and articles).
- Communities: Reddit (posts and comments where people discuss brands).
- Video: YouTube (video titles/descriptions and comments where applicable).
- Blogs/RSS: Direct blog feeds; Firecrawl to extract clean article text when needed.

—

6) What this means for budget and access
What we need
- API access keys: Bing Web Search, GNews, YouTube, Reddit app, Firecrawl.
- Estimated monthly costs: typically a few hundred dollars at MVP scale; can scale up or down.

Controls
- We’ll set limits and alerts so we don’t overspend.
- We can tune how many results we pull per day based on value.

—

7) Risks and how we’ll manage them
- Noise and duplicates: Use source quality scores and de-duplication.
- API rate limits: Cache results and schedule queries to avoid spikes.
- Terms of service: Stick to official APIs and permitted use.
- Content quality: Extract clean text and filter low-value pages.
- Privacy and security: Don’t store sensitive personal data; follow best practices.
