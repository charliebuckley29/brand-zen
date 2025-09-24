import { MessageSquare, Youtube, Twitter, Rss } from "lucide-react";

export type SourceType = "reddit" | "youtube" | "x" | "google_alert";

export type SourceCategory = "news" | "social" | "video";

export interface SourceConfig {
  id: SourceType;
  name: string;
  category: SourceCategory;
  description: string;
  examples: string[];
  implemented: boolean;
  implementationNotes?: string;
  apiProvider?: string;
  limitations?: string[];
  icon?: any; // Lucide React icon component
  configFields?: Array<{
    name: string;
    label: string;
    placeholder?: string;
    type?: string;
  }>;
}

export interface SourceCategoryConfig {
  id: SourceCategory;
  name: string;
  description: string;
  icon: string;
}

export const SOURCE_CATEGORIES: Record<SourceCategory, SourceCategoryConfig> = {
  news: {
    id: "news",
    name: "News Sites",
    description: "Major news publications and industry outlets",
    icon: "newspaper"
  },
  social: {
    id: "social", 
    name: "Social Media",
    description: "Social platforms and community forums",
    icon: "users"
  },
  video: {
    id: "video",
    name: "Video Platforms",
    description: "Video sharing and streaming platforms",
    icon: "video"
  }
};

export const SOURCES: Record<SourceType, SourceConfig> = {
  reddit: {
    id: "reddit",
    name: "Reddit",
    category: "social",
    description: "Posts and comments from Reddit communities",
    examples: [
      "r/technology",
      "r/business", 
      "r/startups",
      "Industry-specific subreddits",
      "Local community subreddits"
    ],
    implemented: true,
    apiProvider: "Reddit API",
    implementationNotes: "Monitors posts and comments across relevant subreddits",
    limitations: [
      "Rate limited by Reddit API",
      "May miss some private subreddits"
    ],
    icon: MessageSquare,
    configFields: [
      {
        name: "user_agent",
        label: "User Agent",
        placeholder: "e.g., YourApp/1.0",
        type: "text"
      }
    ]
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    category: "video", 
    description: "Video content and comments from YouTube",
    examples: [
      "Video titles and descriptions",
      "YouTube comments",
      "Channel mentions",
      "Video tags and metadata"
    ],
    implemented: true,
    apiProvider: "YouTube Data API",
    implementationNotes: "Searches video metadata and public comments",
    limitations: [
      "Limited by YouTube API quotas",
      "Cannot access private videos or comments"
    ],
    icon: Youtube
  },
  x: {
    id: "x",
    name: "X (Twitter)",
    category: "social",
    description: "Posts, replies, and mentions from X (formerly Twitter)",
    examples: [
      "Brand mentions in tweets",
      "Customer complaints and feedback",
      "Product discussions",
      "Trending topics and hashtags",
      "User-generated content"
    ],
    implemented: true,
    apiProvider: "X API v2",
    implementationNotes: "Monitors public posts and replies for brand mentions",
    limitations: [
      "500,000 tweets per month on Basic tier",
      "Public content only",
      "Rate limited by X API"
    ],
    icon: Twitter
  },
  google_alert: {
    id: "google_alert",
    name: "Google Alerts",
    category: "news",
    description: "Mentions from Google Alerts RSS feeds",
    examples: [
      "News articles from Google Alerts",
      "Blog posts and web content",
      "Recent publications mentioning your brand",
      "Real-time Google search results"
    ],
    implemented: true,
    apiProvider: "Google Alerts RSS",
    implementationNotes: "Monitors Google Alerts RSS feeds for real-time mentions",
    limitations: [
      "Requires manual setup of Google Alerts",
      "Depends on Google's indexing speed"
    ],
    icon: Rss
  }
};

// Helper functions for easy access
export const getSourcesByCategory = (category: SourceCategory): SourceConfig[] => {
  return Object.values(SOURCES).filter(source => source.category === category);
};

export const getImplementedSources = (): SourceConfig[] => {
  return Object.values(SOURCES).filter(source => source.implemented);
};

export const getSourceConfig = (sourceType: SourceType): SourceConfig | undefined => {
  return SOURCES[sourceType];
};

export const getAllSourceTypes = (): SourceType[] => {
  return Object.keys(SOURCES) as SourceType[];
};

// For future expansion - sources we're planning to implement
export const PLANNED_SOURCES: Partial<Record<string, Omit<SourceConfig, 'id' | 'implemented'>>> = {
  linkedin: {
    name: "LinkedIn", 
    category: "social",
    description: "LinkedIn posts and professional content",
    examples: ["Company page posts", "Professional articles", "LinkedIn comments"],
    apiProvider: "LinkedIn API",
    limitations: ["Limited API access", "Professional content only"]
  },
  facebook: {
    name: "Facebook",
    category: "social", 
    description: "Public Facebook posts and pages",
    examples: ["Public posts", "Page content", "Public comments"],
    apiProvider: "Facebook Graph API",
    limitations: ["Limited to public content only"]
  }
};