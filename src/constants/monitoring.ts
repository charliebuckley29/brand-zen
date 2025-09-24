import { ApiLimit } from '../types/monitoring';

export const API_LIMITS: ApiLimit[] = [
  {
    name: 'Google CSE',
    free: 100,
    paid: 10000,
    unit: 'queries/day',
    description: 'Google Custom Search Engine API for web search',
    warningThreshold: 0.8
  },
  {
    name: 'Google Alerts',
    free: 1000,
    paid: 10000,
    unit: 'RSS fetches/day',
    description: 'Google Alerts RSS feed processing',
    warningThreshold: 0.9
  },
  {
    name: 'GNews',
    free: 100,
    paid: 1000,
    unit: 'articles/day',
    description: 'GNews API for news article fetching',
    warningThreshold: 0.8
  },
  {
    name: 'YouTube Data API',
    free: 10000,
    paid: 1000000,
    unit: 'quota units/day',
    description: 'YouTube API for video and channel data',
    warningThreshold: 0.85
  },
  {
    name: 'Reddit API',
    free: 60,
    paid: 300,
    unit: 'requests/min',
    description: 'Reddit API for post and comment fetching',
    warningThreshold: 0.8
  },
  {
    name: 'SendGrid',
    free: 100,
    paid: 50000,
    unit: 'emails/day',
    description: 'Email delivery service',
    warningThreshold: 0.9
  }
];

export const SYSTEM_HEALTH_THRESHOLDS = {
  HEALTHY: 5,      // Error rate < 5%
  WARNING: 10,     // Error rate < 10%
  CRITICAL: 10     // Error rate >= 10%
};

export const REFRESH_INTERVALS = {
  FAST: 15000,     // 15 seconds
  NORMAL: 30000,   // 30 seconds
  SLOW: 60000      // 1 minute
};

export const MAX_RETRIES = 3;
export const CACHE_TIMEOUT = 300000; // 5 minutes


