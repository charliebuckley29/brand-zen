# API Documentation

## Overview

Brand Zen uses a combination of Supabase (PostgreSQL + Edge Functions) and external APIs to provide comprehensive brand monitoring capabilities.

## Database API (Supabase)

### Authentication

All database operations require authentication via Supabase Auth:

```typescript
import { supabase } from '@/integrations/supabase/client';

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});
```

### Core Tables

#### Profiles

User profiles and settings.

```typescript
interface Profile {
  id: string;                    // UUID, primary key
  user_id: string;              // UUID, foreign key to auth.users
  full_name: string;            // User's full name
  email: string;                // User's email
  role: 'admin' | 'moderator' | 'user';  // User role
  keywords: string[];           // Monitoring keywords
  notification_preferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  created_at: string;           // ISO timestamp
  updated_at: string;           // ISO timestamp
}
```

**Operations:**
```typescript
// Get user profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .single();

// Update profile
const { error } = await supabase
  .from('profiles')
  .update({ keywords: newKeywords })
  .eq('user_id', userId);
```

#### Mentions

Brand mentions from all sources.

```typescript
interface Mention {
  id: string;                   // UUID, primary key
  user_id: string;             // UUID, foreign key to profiles
  content: string;             // Full content of the mention
  content_snippet: string;     // Short snippet for display
  source_name: string;         // Name of the source (e.g., "CNN", "Reddit")
  source_type: 'news' | 'reddit' | 'youtube' | 'web' | 'google_alerts';
  source_url: string;          // URL to the original content
  published_at: string;        // ISO timestamp of publication
  sentiment: number | null;    // Sentiment score (-100 to 100)
  flagged: boolean;            // Whether mention is flagged for review
  escalation_type: string | null;  // Escalation level if flagged
  metadata: {
    author?: string;
    subreddit?: string;
    channel?: string;
    tags?: string[];
    [key: string]: any;
  };
  created_at: string;          // ISO timestamp
  updated_at: string;          // ISO timestamp
}
```

**Operations:**
```typescript
// Get mentions with pagination and filters
const { data: mentions, count } = await supabase
  .from('mentions')
  .select('*', { count: 'exact' })
  .eq('user_id', userId)
  .in('source_type', sourceTypes)
  .ilike('content_snippet', `%${searchQuery}%`)
  .order('published_at', { ascending: false })
  .range(offset, offset + limit - 1);

// Add new mention
const { error } = await supabase
  .from('mentions')
  .insert({
    user_id: userId,
    content: mentionContent,
    content_snippet: snippet,
    source_name: sourceName,
    source_type: sourceType,
    source_url: sourceUrl,
    published_at: publishedAt,
    sentiment: sentimentScore,
    metadata: metadata
  });
```

#### Notifications

User notifications and alerts.

```typescript
interface Notification {
  id: string;                   // UUID, primary key
  user_id: string;             // UUID, foreign key to profiles
  type: 'mention' | 'alert' | 'system' | 'warning' | 'error';
  title: string;               // Notification title
  message: string;             // Notification message
  read: boolean;               // Whether notification has been read
  data: {
    mention_id?: string;
    alert_type?: string;
    [key: string]: any;
  };
  created_at: string;          // ISO timestamp
  updated_at: string;          // ISO timestamp
}
```

**Operations:**
```typescript
// Get user notifications
const { data: notifications } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

// Mark notification as read
const { error } = await supabase
  .from('notifications')
  .update({ read: true, updated_at: new Date().toISOString() })
  .eq('id', notificationId);
```

### Row Level Security (RLS)

All tables have RLS policies to ensure data security:

```sql
-- Users can only access their own data
CREATE POLICY "Users can view own mentions" ON mentions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mentions" ON mentions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can access all data
CREATE POLICY "Admins can view all mentions" ON mentions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
```

## Edge Functions API

### Automated Mention Fetch

Fetches mentions from all configured sources.

**Endpoint:** `POST /functions/v1/automated-mention-fetch`

**Request:**
```typescript
interface FetchRequest {
  user_id: string;
  keywords: string[];
  sources: string[];
  force_fetch?: boolean;
}
```

**Response:**
```typescript
interface FetchResponse {
  success: boolean;
  mentions_added: number;
  sources_processed: string[];
  errors: string[];
  execution_time: number;
}
```

**Usage:**
```typescript
const { data, error } = await supabase.functions.invoke('automated-mention-fetch', {
  body: {
    user_id: userId,
    keywords: ['brand name', 'product name'],
    sources: ['news', 'reddit', 'youtube']
  }
});
```

### Google Alerts

Processes Google Alerts RSS feeds.

**Endpoint:** `POST /functions/v1/google-alerts`

**Request:**
```typescript
interface GoogleAlertsRequest {
  user_id: string;
  keywords: string[];
  rss_urls: string[];
}
```

**Response:**
```typescript
interface GoogleAlertsResponse {
  success: boolean;
  mentions_found: number;
  feeds_processed: number;
  errors: string[];
}
```

### Aggregate Sources

Aggregates and processes mentions from multiple sources.

**Endpoint:** `POST /functions/v1/aggregate-sources`

**Request:**
```typescript
interface AggregateRequest {
  user_id: string;
  time_range: {
    start: string;
    end: string;
  };
  sources: string[];
}
```

## External APIs

### GNews API

News article fetching and sentiment analysis.

**Base URL:** `https://gnews.io/api/v4`

**Authentication:** API key in header

**Endpoints:**
```typescript
// Search articles
GET /search?q={query}&lang=en&country=us&max=10&apikey={api_key}

// Get article by ID
GET /article?id={article_id}&apikey={api_key}
```

**Response:**
```typescript
interface GNewsResponse {
  articles: Array<{
    title: string;
    description: string;
    content: string;
    url: string;
    image: string;
    publishedAt: string;
    source: {
      name: string;
      url: string;
    };
  }>;
  totalArticles: number;
}
```

### Reddit API

Reddit posts and comments monitoring.

**Base URL:** `https://oauth.reddit.com`

**Authentication:** OAuth2 Bearer token

**Endpoints:**
```typescript
// Search posts
GET /search?q={query}&sort=new&limit=25

// Get subreddit posts
GET /r/{subreddit}/new?limit=25

// Get post comments
GET /r/{subreddit}/comments/{post_id}
```

### YouTube API

YouTube video and comment monitoring.

**Base URL:** `https://www.googleapis.com/youtube/v3`

**Authentication:** API key

**Endpoints:**
```typescript
// Search videos
GET /search?part=snippet&q={query}&type=video&maxResults=25&key={api_key}

// Get video details
GET /videos?part=snippet,statistics&id={video_id}&key={api_key}

// Get video comments
GET /commentThreads?part=snippet&videoId={video_id}&maxResults=100&key={api_key}
```

## Data Service Layer

The `dataService.ts` provides a clean abstraction over all API calls:

```typescript
// Fetch mentions with filters
const mentions = await dataService.fetchMentions(
  page: number,
  pageSize: number,
  sourceTypes: string[],
  searchQuery: string,
  sentimentFilter: number | null,
  flaggedFilter: boolean | null,
  escalationFilter: string | null,
  userId: string
);

// Get mention statistics
const stats = await dataService.fetchMentionsStats(userId);

// Fetch notifications
const notifications = await dataService.fetchNotifications(userId, read, limit);

// Mark notification as read
await dataService.markNotificationAsRead(notificationId, userId);
```

## Error Handling

### API Error Types

```typescript
interface APIError {
  message: string;
  code: string;
  status: number;
  details?: any;
}

// Common error codes
enum ErrorCodes {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
```

### Error Handling Pattern

```typescript
try {
  const result = await dataService.fetchMentions(/* params */);
  return result;
} catch (error) {
  if (error.status === 401) {
    // Handle unauthorized
    logger.warn('User not authenticated');
    throw new Error('Please log in to continue');
  } else if (error.status === 429) {
    // Handle rate limiting
    logger.warn('Rate limited');
    throw new Error('Too many requests. Please try again later.');
  } else {
    // Handle other errors
    logger.error('API error:', error);
    throw new Error('An error occurred. Please try again.');
  }
}
```

## Rate Limiting

### External API Limits

- **GNews:** 100 requests/day (free), 10,000 requests/day (paid)
- **Reddit:** 60 requests/minute
- **YouTube:** 10,000 quota units/day
- **Google Alerts:** 1,000 RSS fetches/day

### Implementation

```typescript
// Rate limiting in edge functions
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (key: string, limit: number, windowMs: number): boolean => {
  const now = Date.now();
  const userLimit = rateLimiter.get(key);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimiter.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= limit) {
    return false;
  }
  
  userLimit.count++;
  return true;
};
```

## Webhooks

### Mention Processing Webhook

Triggered when new mentions are processed:

**Endpoint:** `POST /webhooks/mention-processed`

**Payload:**
```typescript
interface MentionWebhookPayload {
  user_id: string;
  mention_id: string;
  source_type: string;
  sentiment: number;
  flagged: boolean;
  timestamp: string;
}
```

### Notification Webhook

Triggered when notifications are sent:

**Endpoint:** `POST /webhooks/notification-sent`

**Payload:**
```typescript
interface NotificationWebhookPayload {
  user_id: string;
  notification_id: string;
  type: string;
  channel: 'email' | 'sms' | 'push';
  timestamp: string;
}
```

## Testing APIs

### Unit Testing

```typescript
// Test data service functions
describe('dataService', () => {
  it('should fetch mentions', async () => {
    const mentions = await dataService.fetchMentions(1, 10, [], '', null, null, null, 'user-id');
    expect(mentions).toBeDefined();
    expect(Array.isArray(mentions.data)).toBe(true);
  });
});
```

### Integration Testing

```typescript
// Test edge functions
describe('Edge Functions', () => {
  it('should process automated mention fetch', async () => {
    const { data, error } = await supabase.functions.invoke('automated-mention-fetch', {
      body: { user_id: 'test-user', keywords: ['test'] }
    });
    
    expect(error).toBeNull();
    expect(data.success).toBe(true);
  });
});
```

## Monitoring and Analytics

### API Usage Tracking

```typescript
// Track API usage
await supabase.from('api_usage_tracking').insert({
  user_id: userId,
  api_source: 'gnews',
  endpoint: '/search',
  response_status: 200,
  response_time: 150,
  calls_count: 1
});
```

### Performance Metrics

```typescript
// Track performance
const startTime = performance.now();
const result = await dataService.fetchMentions(/* params */);
const endTime = performance.now();

// Log performance metric
logger.info('API Performance', {
  operation: 'fetchMentions',
  duration: endTime - startTime,
  resultCount: result.data.length
});
```
