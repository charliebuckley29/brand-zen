import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { Search, Edit, Globe, AlertCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface KeywordManagement {
  id: string;
  user_id: string;
  keyword_text: string;
  keyword_type: 'brand_name' | 'variant';
  google_alert_rss_url: string;
  google_alerts_enabled: boolean;
  youtube_enabled: boolean;
  reddit_enabled: boolean;
  x_enabled: boolean;
  rss_news_enabled: boolean;
  rss_news_url: string;
  user_full_name: string;
  user_brand_name: string;
  created_at: string;
  updated_at: string;
  original_keyword_id: string;
}

export function KeywordsTab() {
  const [keywords, setKeywords] = useState<KeywordManagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKeyword, setSelectedKeyword] = useState<KeywordManagement | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Fetch keywords
  const fetchKeywords = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/admin/keywords-management?include_all=true');
      const data = await response.json();
      
      if (data.success) {
        setKeywords(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch keywords",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch keywords",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeywords();
  }, []);

  // Filter keywords based on search term
  const filteredKeywords = keywords.filter(keyword =>
    keyword.keyword_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    keyword.user_full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    keyword.user_brand_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Update keyword configuration
  const updateKeyword = async (keywordId: string, updates: Partial<KeywordManagement>) => {
    try {
      setIsUpdating(true);
      const response = await apiFetch('/admin/keywords-management', {
        method: 'PUT',
        body: JSON.stringify({ keywordId, updates })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Keyword configuration updated successfully"
        });
        
        // Refresh keywords list
        await fetchKeywords();
        setEditDialogOpen(false);
        setSelectedKeyword(null);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update keyword",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update keyword",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // RSS URL validation
  const validateRssUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return true; // Empty is valid (optional field)
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.includes('google.com') && 
             parsedUrl.pathname.includes('/alerts/feeds/');
    } catch {
      return false;
    }
  };

  // Get status badge for keyword
  const getStatusBadge = (keyword: KeywordManagement) => {
    if (keyword.google_alerts_enabled && keyword.google_alert_rss_url) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Configured</Badge>;
    } else if (keyword.google_alerts_enabled && !keyword.google_alert_rss_url) {
      return <Badge variant="destructive">Missing RSS URL</Badge>;
    } else {
      return <Badge variant="secondary">Disabled</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading keywords...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Keywords Management</h2>
          <p className="text-muted-foreground">
            Manage RSS URLs and API configurations for individual keywords
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchKeywords} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search keywords, users, or brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Keywords Table */}
      <Card>
        <CardHeader>
          <CardTitle>Keywords ({filteredKeywords.length})</CardTitle>
          <CardDescription>
            Individual keywords with their RSS URL configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>RSS URL Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKeywords.map((keyword) => (
                  <TableRow key={keyword.id}>
                    <TableCell className="font-medium">
                      {keyword.keyword_text}
                    </TableCell>
                    <TableCell>
                      <Badge variant={keyword.keyword_type === 'brand_name' ? 'default' : 'secondary'}>
                        {keyword.keyword_type === 'brand_name' ? 'Brand' : 'Variant'}
                      </Badge>
                    </TableCell>
                    <TableCell>{keyword.user_full_name}</TableCell>
                    <TableCell>{keyword.user_brand_name}</TableCell>
                    <TableCell>{getStatusBadge(keyword)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedKeyword(keyword);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Keyword: {selectedKeyword?.keyword_text}</DialogTitle>
            <DialogDescription>
              Set RSS URLs and API configurations for this keyword
            </DialogDescription>
          </DialogHeader>
          
          {selectedKeyword && (
            <KeywordEditForm
              keyword={selectedKeyword}
              onUpdate={updateKeyword}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedKeyword(null);
              }}
              isUpdating={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Keyword Edit Form Component
interface KeywordEditFormProps {
  keyword: KeywordManagement;
  onUpdate: (keywordId: string, updates: Partial<KeywordManagement>) => void;
  onCancel: () => void;
  isUpdating: boolean;
}

function KeywordEditForm({ keyword, onUpdate, onCancel, isUpdating }: KeywordEditFormProps) {
  const [rssUrl, setRssUrl] = useState(keyword.google_alert_rss_url || '');
  const [googleAlertsEnabled, setGoogleAlertsEnabled] = useState(keyword.google_alerts_enabled);
  const [youtubeEnabled, setYoutubeEnabled] = useState(keyword.youtube_enabled);
  const [redditEnabled, setRedditEnabled] = useState(keyword.reddit_enabled);
  const [xEnabled, setXEnabled] = useState(keyword.x_enabled);
  const [rssNewsEnabled, setRssNewsEnabled] = useState(keyword.rss_news_enabled);
  const [rssNewsUrl, setRssNewsUrl] = useState(keyword.rss_news_url || '');

  const validateRssUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return true;
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.includes('google.com') && 
             parsedUrl.pathname.includes('/alerts/feeds/');
    } catch {
      return false;
    }
  };

  const handleSave = () => {
    onUpdate(keyword.id, {
      google_alert_rss_url: rssUrl,
      google_alerts_enabled: googleAlertsEnabled,
      youtube_enabled: youtubeEnabled,
      reddit_enabled: redditEnabled,
      x_enabled: xEnabled,
      rss_news_enabled: rssNewsEnabled,
      rss_news_url: rssNewsUrl
    });
  };

  return (
    <div className="space-y-6">
      {/* Keyword Info */}
      <div className="bg-muted p-4 rounded-lg">
        <h4 className="font-medium mb-2">Keyword Information</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Keyword:</span> {keyword.keyword_text}
          </div>
          <div>
            <span className="font-medium">Type:</span> {keyword.keyword_type}
          </div>
          <div>
            <span className="font-medium">User:</span> {keyword.user_full_name}
          </div>
          <div>
            <span className="font-medium">Brand:</span> {keyword.user_brand_name}
          </div>
        </div>
      </div>

      {/* Google Alerts Configuration */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="google-alerts-enabled"
            checked={googleAlertsEnabled}
            onChange={(e) => setGoogleAlertsEnabled(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="google-alerts-enabled">Enable Google Alerts</Label>
        </div>

        {googleAlertsEnabled && (
          <div>
            <Label htmlFor="google-alerts-rss">Google Alerts RSS URL</Label>
            <Textarea
              id="google-alerts-rss"
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              placeholder="https://www.google.com/alerts/feeds/..."
              rows={3}
              className={!validateRssUrl(rssUrl) && rssUrl ? 'border-red-500' : ''}
            />
            <p className="text-xs text-muted-foreground mt-1">
              💡 <strong>Tip:</strong> You can use the same RSS URL for multiple keywords if they're related. 
              The system will automatically deduplicate processing for better performance.
            </p>
            {!validateRssUrl(rssUrl) && rssUrl && (
              <p className="text-xs text-red-600 mt-1">
                ⚠️ Please enter a valid Google Alerts RSS URL (should contain "google.com/alerts/feeds/")
              </p>
            )}
          </div>
        )}
      </div>

      {/* Other API Sources */}
      <div className="space-y-4">
        <h4 className="font-medium">Other API Sources</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="youtube-enabled"
              checked={youtubeEnabled}
              onChange={(e) => setYoutubeEnabled(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="youtube-enabled">YouTube</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="reddit-enabled"
              checked={redditEnabled}
              onChange={(e) => setRedditEnabled(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="reddit-enabled">Reddit</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="x-enabled"
              checked={xEnabled}
              onChange={(e) => setXEnabled(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="x-enabled">X (Twitter)</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="rss-news-enabled"
              checked={rssNewsEnabled}
              onChange={(e) => setRssNewsEnabled(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="rss-news-enabled">RSS News</Label>
          </div>
        </div>

        {rssNewsEnabled && (
          <div>
            <Label htmlFor="rss-news-url">RSS News URL</Label>
            <Input
              id="rss-news-url"
              value={rssNewsUrl}
              onChange={(e) => setRssNewsUrl(e.target.value)}
              placeholder="https://example.com/rss"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel} disabled={isUpdating}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isUpdating}>
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
