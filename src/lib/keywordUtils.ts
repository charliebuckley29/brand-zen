/**
 * Utility functions for handling standardized keyword format
 * 
 * Standard: Backend always returns keywords as a flat list with brand name first, followed by variants
 * Frontend extrapolates brand name (first item) and variants (remaining items) from this list
 */

export interface StandardizedKeyword {
  id: string;
  user_id: string;
  keyword_text: string;
  keyword_type: 'brand_name' | 'variant';
  keyword_order: number; // 0 = brand name, 1+ = variants
  google_alert_rss_url?: string;
  google_alerts_enabled?: boolean;
  youtube_enabled?: boolean;
  reddit_enabled?: boolean;
  x_enabled?: boolean;
  rss_news_enabled?: boolean;
  rss_news_url?: string;
  user_full_name?: string;
  user_brand_name?: string;
  created_at: string;
  updated_at: string;
  original_keyword_id: string;
}

export interface ExtractedBrandInfo {
  brand_name: string;
  variants: string[];
  all_keywords: string[]; // Flat list: [brand_name, ...variants]
}

/**
 * Extract brand name and variants from a standardized keyword list
 * @param keywords - Array of standardized keywords from backend
 * @returns Object with brand_name, variants array, and all_keywords flat list
 */
export function extractBrandInfo(keywords: StandardizedKeyword[]): ExtractedBrandInfo {
  if (!keywords || keywords.length === 0) {
    return {
      brand_name: '',
      variants: [],
      all_keywords: []
    };
  }

  // Sort by keyword_order to ensure correct order
  const sortedKeywords = [...keywords].sort((a, b) => a.keyword_order - b.keyword_order);
  
  // Extract brand name (first item, order 0)
  const brandKeyword = sortedKeywords.find(k => k.keyword_order === 0);
  const brand_name = brandKeyword?.keyword_text || '';
  
  // Extract variants (remaining items, order 1+)
  const variantKeywords = sortedKeywords.filter(k => k.keyword_order > 0);
  const variants = variantKeywords.map(k => k.keyword_text);
  
  // Create flat list of all keywords
  const all_keywords = sortedKeywords.map(k => k.keyword_text);

  return {
    brand_name,
    variants,
    all_keywords
  };
}

/**
 * Group keywords by user_id and extract brand info for each user
 * @param keywords - Array of standardized keywords from backend
 * @returns Map of user_id -> ExtractedBrandInfo
 */
export function groupKeywordsByUser(keywords: StandardizedKeyword[]): Map<string, ExtractedBrandInfo> {
  const userMap = new Map<string, ExtractedBrandInfo>();
  
  // Group keywords by user_id
  const keywordsByUser = keywords.reduce((acc, keyword) => {
    if (!acc[keyword.user_id]) {
      acc[keyword.user_id] = [];
    }
    acc[keyword.user_id].push(keyword);
    return acc;
  }, {} as Record<string, StandardizedKeyword[]>);
  
  // Extract brand info for each user
  Object.entries(keywordsByUser).forEach(([userId, userKeywords]) => {
    userMap.set(userId, extractBrandInfo(userKeywords));
  });
  
  return userMap;
}

/**
 * Get the brand name from a standardized keyword list (convenience function)
 * @param keywords - Array of standardized keywords from backend
 * @returns Brand name string
 */
export function getBrandName(keywords: StandardizedKeyword[]): string {
  return extractBrandInfo(keywords).brand_name;
}

/**
 * Get the variants from a standardized keyword list (convenience function)
 * @param keywords - Array of standardized keywords from backend
 * @returns Array of variant strings
 */
export function getVariants(keywords: StandardizedKeyword[]): string[] {
  return extractBrandInfo(keywords).variants;
}

/**
 * Get all keywords as a flat list (convenience function)
 * @param keywords - Array of standardized keywords from backend
 * @returns Flat array of keyword strings
 */
export function getAllKeywords(keywords: StandardizedKeyword[]): string[] {
  return extractBrandInfo(keywords).all_keywords;
}

/**
 * Check if a keyword list has any variants
 * @param keywords - Array of standardized keywords from backend
 * @returns Boolean indicating if variants exist
 */
export function hasVariants(keywords: StandardizedKeyword[]): boolean {
  return getVariants(keywords).length > 0;
}

/**
 * Get the total number of keywords (brand name + variants)
 * @param keywords - Array of standardized keywords from backend
 * @returns Total count of keywords
 */
export function getKeywordCount(keywords: StandardizedKeyword[]): number {
  return getAllKeywords(keywords).length;
}
