/**
 * Utility functions for cleaning and formatting content text
 */

/**
 * Decodes HTML entities and strips HTML tags from content
 */
export function cleanHtmlContent(content: string): string {
  if (!content) return '';
  
  // Create a temporary div to decode HTML entities
  const temp = document.createElement('div');
  temp.innerHTML = content;
  
  // Get the decoded text content (this strips HTML tags and decodes entities)
  let cleaned = temp.textContent || temp.innerText || '';
  
  // Additional cleanup for common patterns
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')           // Non-breaking spaces
    .replace(/&amp;/g, '&')           // Ampersands
    .replace(/&lt;/g, '<')            // Less than
    .replace(/&gt;/g, '>')            // Greater than
    .replace(/&quot;/g, '"')          // Quotes
    .replace(/&#39;/g, "'")           // Apostrophes
    .replace(/&#x27;/g, "'")          // Apostrophes (hex)
    .replace(/\s+/g, ' ')             // Multiple whitespaces
    .trim();                          // Leading/trailing whitespace
  
  return cleaned;
}

/**
 * Truncates text to a specified length and adds ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Cleans and truncates content for display
 */
export function cleanAndTruncate(content: string, maxLength: number = 200): string {
  const cleaned = cleanHtmlContent(content);
  return truncateText(cleaned, maxLength);
}