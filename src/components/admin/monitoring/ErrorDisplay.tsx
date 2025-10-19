import { useState } from "react";
import { AlertTriangle, Eye, EyeOff, Copy, Check } from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";

interface ErrorDisplayProps {
  error: string;
  className?: string;
}

export function ErrorDisplay({ error, className = "" }: ErrorDisplayProps) {
  const [showHtml, setShowHtml] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check if the error contains HTML
  const isHtml = error.includes('<') && error.includes('>');

  // Extract title from HTML if possible
  const extractTitle = (html: string): string => {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      return titleMatch[1];
    }
    
    // Try to extract from error messages
    if (html.includes('Error 400')) return 'HTTP 400: Bad Request';
    if (html.includes('Error 403')) return 'HTTP 403: Forbidden';
    if (html.includes('Error 404')) return 'HTTP 404: Not Found';
    if (html.includes('Error 429')) return 'HTTP 429: Too Many Requests';
    if (html.includes('Error 500')) return 'HTTP 500: Internal Server Error';
    if (html.includes('blocked by network security')) return 'HTTP 403: Blocked by Network Security';
    
    return 'API Error';
  };

  // Extract key error message from HTML
  const extractErrorMessage = (html: string): string => {
    // Try to find common error patterns
    const patterns = [
      /<p[^>]*>([^<]*error[^<]*)<\/p>/i,
      /<b[^>]*>([^<]*)<\/b>/i,
      /That's an error\./i,
      /blocked by network security/i,
      /malformed or illegal request/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    // If no pattern matches, return first 100 characters
    return html.substring(0, 100) + (html.length > 100 ? '...' : '');
  };

  // Clean HTML for display (remove scripts, styles, etc.)
  const cleanHtml = (html: string): string => {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<link[^>]*>/gi, '')
      .replace(/<meta[^>]*>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(error);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const title = isHtml ? extractTitle(error) : 'API Error';
  const errorMessage = isHtml ? extractErrorMessage(error) : error;

  return (
    <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <p className="text-sm font-medium text-red-800">{title}</p>
        </div>
        <div className="flex items-center gap-2">
          {isHtml && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHtml(!showHtml)}
              className="h-8 px-2"
            >
              {showHtml ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showHtml ? 'Hide HTML' : 'Show HTML'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="h-8 px-2"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Error Summary */}
        <div>
          <p className="text-sm text-red-700 font-medium mb-1">Error Summary:</p>
          <p className="text-sm text-red-600 bg-red-100 p-2 rounded border">
            {errorMessage}
          </p>
        </div>

        {/* HTML Content (if available and requested) */}
        {isHtml && showHtml && (
          <div>
            <p className="text-sm text-red-700 font-medium mb-2">Full Error Response:</p>
            <div className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-auto max-h-64 text-xs font-mono">
              <pre className="whitespace-pre-wrap break-all">
                {cleanHtml(error)}
              </pre>
            </div>
          </div>
        )}

        {/* Helpful Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm font-medium text-blue-800 mb-1">Troubleshooting Tips:</p>
          <ul className="text-xs text-blue-700 space-y-1">
            {error.includes('403') && (
              <li>• Check API credentials and permissions</li>
            )}
            {error.includes('400') && (
              <li>• Verify request parameters and format</li>
            )}
            {error.includes('429') && (
              <li>• Rate limit exceeded - wait before retrying</li>
            )}
            {error.includes('blocked') && (
              <li>• Network security blocking - check API configuration</li>
            )}
            <li>• Click "Show HTML" to see full error details</li>
            <li>• Click "Copy" to copy error for support</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

