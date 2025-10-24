import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { 
  Globe, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  Copy,
  Trash2
} from "lucide-react";

interface RssUrlConfigurationDialogProps {
  open: boolean;
  onClose: () => void;
  keyword: string;
  keywordId: string;
  userId: string;
  currentRssUrl?: string | null;
  onRssUrlUpdated: (keywordId: string, rssUrl: string | null) => void;
}

export function RssUrlConfigurationDialog({
  open,
  onClose,
  keyword,
  keywordId,
  userId,
  currentRssUrl,
  onRssUrlUpdated
}: RssUrlConfigurationDialogProps) {
  const [rssUrl, setRssUrl] = useState(currentRssUrl || '');
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    isAccessible?: boolean;
  } | null>(null);
  const { toast } = useToast();

  // RSS URL validation function
  const validateRssUrl = (url: string): { isValid: boolean; message: string } => {
    if (!url || url.trim() === '') {
      return { isValid: true, message: 'Empty URL is valid (will disable RSS)' };
    }
    
    try {
      const parsedUrl = new URL(url);
      const isValidGoogleAlerts = (
        (parsedUrl.hostname.includes('google.com') || 
         parsedUrl.hostname.includes('google.co.uk')) && 
        parsedUrl.pathname.includes('/alerts/feeds/')
      );
      
      if (!isValidGoogleAlerts) {
        return { 
          isValid: false, 
          message: 'URL must be a Google Alerts RSS feed URL' 
        };
      }
      
      return { isValid: true, message: 'Valid Google Alerts RSS URL' };
    } catch {
      return { isValid: false, message: 'Invalid URL format' };
    }
  };

  // Test RSS URL accessibility
  const testRssUrl = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Handle URL validation
  const handleValidateUrl = async () => {
    if (!rssUrl.trim()) {
      setValidationResult({ isValid: true, message: 'Empty URL is valid' });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      // First validate format
      const formatValidation = validateRssUrl(rssUrl);
      if (!formatValidation.isValid) {
        setValidationResult(formatValidation);
        return;
      }

      // Then test accessibility
      const isAccessible = await testRssUrl(rssUrl);
      setValidationResult({
        isValid: true,
        message: isAccessible ? 'RSS feed is accessible' : 'RSS feed may not be accessible',
        isAccessible
      });
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: 'Error testing RSS URL'
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log('🔧 [RSS_DIALOG] ===== SAVE RSS URL START =====');
      console.log('🔧 [RSS_DIALOG] Save parameters:', {
        userId,
        keyword,
        keywordId,
        rssUrl: rssUrl.trim() || null,
        currentRssUrl,
        sourceType: 'google_alert'
      });

      const requestBody = {
        userId,
        keyword,
        sourceType: 'google_alert',
        preferences: {
          automation_enabled: true, // Keep automation enabled
          automation_configured: true, // Mark as configured
          show_in_mentions: true,
          show_in_analytics: true,
          show_in_reports: true,
          source_url: rssUrl.trim() || null
        }
      };

      console.log('🔧 [RSS_DIALOG] Request body:', requestBody);
      console.log('🔧 [RSS_DIALOG] Making API call to /admin/keyword-source-preferences...');

      // Use the correct endpoint that handles keyword_source_preferences updates
      const response = await apiFetch('/admin/keyword-source-preferences', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      });

      console.log('🔧 [RSS_DIALOG] API response status:', response.status, response.statusText);
      console.log('🔧 [RSS_DIALOG] API response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('🔧 [RSS_DIALOG] API response data:', data);
      
      if (data.success) {
        console.log('✅ [RSS_DIALOG] RSS URL save successful');
        console.log('🔧 [RSS_DIALOG] Calling onRssUrlUpdated with:', { keywordId, rssUrl: rssUrl.trim() || null, keyword });
        onRssUrlUpdated(keywordId, rssUrl.trim() || null);
        toast({
          title: "Success",
          description: `RSS URL ${rssUrl.trim() ? 'updated' : 'removed'} for ${keyword}`,
        });
        onClose();
      } else {
        console.error('❌ [RSS_DIALOG] API returned success: false', data);
        throw new Error(data.error || 'Failed to update RSS URL');
      }
    } catch (error: any) {
      console.error('❌ [RSS_DIALOG] Error saving RSS URL:', {
        error: error.message,
        stack: error.stack,
        name: error.name
      });
      toast({
        title: "Error",
        description: error.message || "Failed to update RSS URL",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      console.log('🔧 [RSS_DIALOG] ===== SAVE RSS URL END =====');
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setRssUrl(currentRssUrl || '');
    setValidationResult(null);
    onClose();
  };

  // Handle clear
  const handleClear = () => {
    setRssUrl('');
    setValidationResult(null);
  };

  // Handle copy from another keyword (placeholder for future enhancement)
  const handleCopyFromOther = () => {
    // TODO: Implement copy from other keyword functionality
    toast({
      title: "Feature Coming Soon",
      description: "Copy RSS URL from other keywords will be available soon",
    });
  };

  // Get validation status icon
  const getValidationIcon = () => {
    if (!validationResult) return null;
    
    if (validationResult.isValid) {
      return validationResult.isAccessible ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <AlertCircle className="h-4 w-4 text-yellow-600" />
      );
    } else {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  // Get validation status color
  const getValidationColor = () => {
    if (!validationResult) return 'text-gray-500';
    
    if (validationResult.isValid) {
      return validationResult.isAccessible ? 'text-green-600' : 'text-yellow-600';
    } else {
      return 'text-red-600';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Configure RSS URL
          </DialogTitle>
          <DialogDescription>
            Set up Google Alerts RSS URL for keyword: <Badge variant="outline">{keyword}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* RSS URL Input */}
          <div className="space-y-2">
            <Label htmlFor="rss-url">Google Alerts RSS URL</Label>
            <div className="flex gap-2">
              <Input
                id="rss-url"
                type="url"
                placeholder="https://www.google.com/alerts/feeds/..."
                value={rssUrl}
                onChange={(e) => {
                  setRssUrl(e.target.value);
                  setValidationResult(null);
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidateUrl}
                disabled={isValidating || !rssUrl.trim()}
              >
                {isValidating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Validation Result */}
            {validationResult && (
              <div className={`flex items-center gap-2 text-sm ${getValidationColor()}`}>
                {getValidationIcon()}
                <span>{validationResult.message}</span>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-1">How to get your RSS URL:</h4>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Go to <a href="https://www.google.com/alerts" target="_blank" rel="noopener noreferrer" className="underline">Google Alerts</a></li>
              <li>Create an alert for your keyword</li>
              <li>Click the RSS icon next to your alert</li>
              <li>Copy the RSS feed URL</li>
            </ol>
          </div>

          {/* Current URL Display */}
          {currentRssUrl && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-gray-800 mb-1">Current RSS URL:</h4>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-white px-2 py-1 rounded border flex-1 truncate">
                  {currentRssUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(currentRssUrl, '_blank')}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyFromOther}
                disabled={true} // Disabled for now
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy from Other
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={!rssUrl}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || (validationResult && !validationResult.isValid)}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save RSS URL'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

