import { Globe, MessageSquare, Youtube, FileText, Twitter } from "lucide-react";

export type SourceType = "web" | "news" | "reddit" | "youtube" | "x" | "google_alert";

export type SourceCategory = "news" | "social" | "web" | "video";

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
  web: {
    id: "web",
    name: "Web & Blogs", 
    description: "General web content, blogs, and websites",
    icon: "globe"
  },
  video: {
    id: "video",
    name: "Video Platforms",
    description: "Video sharing and streaming platforms",
    icon: "video"
  }
};

export const SOURCES: Record<SourceType, SourceConfig> = {
  news: {
    id: "news",
    name: "News Articles",
    category: "news",
    description: "News articles from major publications and industry outlets",
    examples: [
      "BBC News",
      "CNN",
      "Reuters", 
      "TechCrunch",
      "The Guardian",
      "Industry trade publications"
    ],
    implemented: true,
    apiProvider: "GNews API",
    implementationNotes: "Covers major news sources globally with real-time updates",
    icon: FileText,
    configFields: [
      {
        name: "country",
        label: "Country Code",
        placeholder: "e.g., us, gb, ca",
        type: "text"
      }
    ]
  },
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
  web: {
    id: "web",
    name: "Web & Blogs",
    category: "web",
    description: "General web content including blogs, forums, and websites",
    examples: [
      "Company blogs",
      "Personal websites", 
      "Industry forums",
      "Product review sites",
      "General web content"
    ],
    implemented: true,
    apiProvider: "Google Custom Search API",
    implementationNotes: "Uses Google Custom Search to find web mentions",
    limitations: [
      "Limited by Google CSE quotas",
      "May not index all web content immediately"
    ],
    icon: Globe,
    configFields: [
      {
        name: "search_engine_id",
        label: "Custom Search Engine ID",
        placeholder: "Your Google CSE ID",
        type: "text"
      }
    ]
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
    icon: Globe
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