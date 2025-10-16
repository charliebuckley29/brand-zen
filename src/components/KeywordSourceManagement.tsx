import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { 
  Search, 
  Edit, 
  Globe, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Youtube, 
  MessageSquare, 
  Rss, 
  Play, 
  Pause, 
  Settings,
  Eye,
  EyeOff,
  BarChart3,
  FileText,
  Zap,
  ZapOff
} from "lucide-react";

interface KeywordSourcePreference {
  id: string;
  user_id: string;
  keyword: string;
  source_type: 'google_alert' | 'reddit' | 'rss_news' | 'x' | 'youtube';
  automation_enabled: boolean;
  automation_configured: boolean;
  show_in_mentions: boolean;
  show_in_analytics: boolean;
  show_in_reports: boolean;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

interface UserKeyword {
  id: string;
  user_id: string;
  brand_name: string;
  keyword_text: string;  // Added this field
  keyword_type: string;  // Added this field
  variants: string[] | null;
  google_alert_rss_url: string | null;
  google_alerts_enabled: boolean;
  youtube_enabled: boolean;  // Added this field
  reddit_enabled: boolean;   // Added this field
  x_enabled: boolean;        // Added this field
  rss_news_enabled: boolean; // Added this field
  rss_news_url: string;      // Added this field
  created_at: string;
  updated_at: string;
  user_full_name: string;
  user_brand_name: string;   // Added this field
}

interface KeywordSourceManagementProps {
  userId: string;
  userName: string;
  open: boolean;
  onClose: () => void;
}

const SOURCE_CONFIG = {
  google_alert: {
    name: 'Google Alerts',
    icon: Globe,
    color: 'bg-blue-100 text-blue-800',
    description: 'RSS feed monitoring'
  },
  reddit: {
    name: 'Reddit',
    icon: MessageSquare,
    color: 'bg-orange-100 text-orange-800',
    description: 'Reddit posts and comments'
  },
  rss_news: {
    name: 'RSS News',
    icon: Rss,
    color: 'bg-green-100 text-green-800',
    description: 'News RSS feeds'
  },
  x: {
    name: 'X (Twitter)',
    icon: MessageSquare,
    color: 'bg-gray-100 text-gray-800',
    description: 'X posts and mentions'
  },
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: 'bg-red-100 text-red-800',
    description: 'YouTube videos and comments'
  }
};

export function KeywordSourceManagement({ userId, userName, open, onClose }: KeywordSourceManagementProps) {
  console.log('🔧 KeywordSourceManagement rendered with:', { userId, userName, open });
  
  // Test if dialog should be visible
  if (open) {
    console.log('🔧 [DIALOG] Dialog should be open!', { userId, userName });
  }
  
  const [keywords, setKeywords] = useState<UserKeyword[]>([]);
  const [preferences, setPreferences] = useState<KeywordSourcePreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPreference, setEditingPreference] = useState<KeywordSourcePreference | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Fetch user keywords and their source preferences
  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔧 [MODERATOR] Fetching data for user:', userId);
      
      // Fetch user keywords with cache busting
      const timestamp = Date.now();
      const keywordsResponse = await apiFetch(`/admin/keywords-management?user_id=${userId}&_t=${timestamp}`);
      console.log('🔧 [MODERATOR] Keywords response status:', keywordsResponse.status);
      
      if (!keywordsResponse.ok) {
        throw new Error(`Keywords API failed: ${keywordsResponse.status} ${keywordsResponse.statusText}`);
      }
      
      const keywordsData = await keywordsResponse.json();
      console.log('🔧 [MODERATOR] Keywords data:', keywordsData);
      
      if (keywordsData.success) {
        setKeywords(keywordsData.data);
        console.log('🔧 [MODERATOR] Set keywords:', keywordsData.data.length, 'keywords');
        
        // For each keyword, fetch source preferences
        const allPreferences: KeywordSourcePreference[] = [];
        
        for (const keyword of keywordsData.data) {
          console.log('🔧 [MODERATOR] Fetching preferences for keyword:', keyword.keyword_text);
          
          // Get preferences for brand name using admin endpoint with cache busting
          const brandPrefsResponse = await apiFetch(`/admin/keyword-source-preferences?userId=${userId}&keyword=${encodeURIComponent(keyword.keyword_text)}&_t=${timestamp}`);
          console.log('🔧 [MODERATOR] Brand prefs response status:', brandPrefsResponse.status);
          
          if (brandPrefsResponse.ok) {
            const brandPrefsData = await brandPrefsResponse.json();
            console.log('🔧 [MODERATOR] Brand prefs data:', brandPrefsData);
            
            if (brandPrefsData.success && brandPrefsData.data) {
              allPreferences.push(...brandPrefsData.data);
              console.log('🔧 [MODERATOR] Added brand preferences:', brandPrefsData.data.length);
            }
          } else {
            console.warn('🔧 [MODERATOR] Brand prefs API failed:', brandPrefsResponse.status);
          }
          
          // Get preferences for variants
          if (keyword.variants && keyword.variants.length > 0) {
            for (const variant of keyword.variants) {
              console.log('🔧 [MODERATOR] Fetching preferences for variant:', variant);
              
              const variantPrefsResponse = await apiFetch(`/admin/keyword-source-preferences?userId=${userId}&keyword=${encodeURIComponent(variant)}&_t=${timestamp}`);
              console.log('🔧 [MODERATOR] Variant prefs response status:', variantPrefsResponse.status);
              
              if (variantPrefsResponse.ok) {
                const variantPrefsData = await variantPrefsResponse.json();
                console.log('🔧 [MODERATOR] Variant prefs data:', variantPrefsData);
                
                if (variantPrefsData.success && variantPrefsData.data) {
                  allPreferences.push(...variantPrefsData.data);
                  console.log('🔧 [MODERATOR] Added variant preferences:', variantPrefsData.data.length);
                }
              } else {
                console.warn('🔧 [MODERATOR] Variant prefs API failed:', variantPrefsResponse.status);
              }
            }
          }
        }
        
        console.log('🔧 [MODERATOR] Total preferences collected:', allPreferences.length);
        setPreferences(allPreferences);
      } else {
        console.error('🔧 [MODERATOR] Keywords API returned success: false', keywordsData);
        throw new Error(keywordsData.error || 'Keywords API failed');
      }
    } catch (error) {
      console.error('🔧 [MODERATOR] Error fetching keyword-source data:', error);
      toast({
        title: "Error",
        description: `Failed to fetch keyword-source preferences: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && userId) {
      console.log('🔧 [DIALOG] Dialog opened, refreshing data for user:', userId);
      fetchData();
    }
  }, [userId, open]);

  // Force refresh when dialog opens to ensure fresh data
  useEffect(() => {
    if (open && userId) {
      console.log('🔧 [DIALOG] Dialog opened, force refreshing data to sync with user settings');
      // Add a small delay to ensure any pending user settings updates are completed
      setTimeout(() => {
        fetchData();
      }, 100);
    }
  }, [open]);

  // Get all unique keywords (brand name + variants)
  const getAllKeywords = () => {
    const allKeywords: string[] = [];
    
    keywords.forEach(keyword => {
      if (keyword.keyword_text) {
        allKeywords.push(keyword.keyword_text);
      }
      if (keyword.variants && Array.isArray(keyword.variants)) {
        allKeywords.push(...keyword.variants.filter(variant => variant && typeof variant === 'string'));
      }
    });
    
    return [...new Set(allKeywords)];
  };

  // Get preferences for a specific keyword
  const getPreferencesForKeyword = (keywordText: string) => {
    if (!keywordText || typeof keywordText !== 'string') {
      return [];
    }
    return preferences.filter(pref => pref.keyword === keywordText);
  };

  // Update a preference
  const updatePreference = async (
    keyword: string, 
    sourceType: string, 
    field: keyof KeywordSourcePreference, 
    value: boolean
  ) => {
    try {
      setIsUpdating(true);
      
      const existingPref = preferences.find(p => 
        p.keyword === keyword && p.source_type === sourceType
      );
      
      const updatedPreferences = {
        automation_enabled: existingPref?.automation_enabled ?? true,
        automation_configured: existingPref?.automation_configured ?? false,
        show_in_mentions: existingPref?.show_in_mentions ?? true,
        show_in_analytics: existingPref?.show_in_analytics ?? true,
        show_in_reports: existingPref?.show_in_reports ?? true,
        [field]: value
      };

      const response = await apiFetch('/admin/keyword-source-preferences', {
        method: 'PUT',
        body: JSON.stringify({
          userId,
          keyword,
          sourceType,
          preferences: updatedPreferences
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Updated ${field.replace('_', ' ')} for ${keyword} on ${SOURCE_CONFIG[sourceType as keyof typeof SOURCE_CONFIG]?.name}`,
        });
        
        // Refresh data
        await fetchData();
      } else {
        throw new Error('Failed to update preference');
      }
    } catch (error) {
      console.error('Error updating preference:', error);
      toast({
        title: "Error",
        description: "Failed to update preference",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Toggle keyword-source pair (simplified interface)
  const toggleKeywordSource = async (keyword: string, sourceType: string, enabled: boolean) => {
    try {
      setIsUpdating(true);
      
      const existingPref = preferences.find(p => 
        p.keyword === keyword && p.source_type === sourceType
      );
      
      // When toggling on: set all display booleans to true
      // When toggling off: set all display booleans to false
      const updatedPreferences = {
        automation_enabled: enabled,
        automation_configured: enabled, // If we're enabling, mark as configured
        show_in_mentions: enabled,
        show_in_analytics: enabled,
        show_in_reports: enabled,
        source_url: existingPref?.source_url || null
      };

      const response = await apiFetch('/admin/keyword-source-preferences', {
        method: 'PUT',
        body: JSON.stringify({
          userId,
          keyword,
          sourceType,
          preferences: updatedPreferences
        })
      });

      if (response.ok) {
        const action = enabled ? 'enabled' : 'disabled';
        toast({
          title: "Success",
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${keyword} on ${SOURCE_CONFIG[sourceType as keyof typeof SOURCE_CONFIG]?.name}`,
        });
        
        // Refresh data
        await fetchData();
      } else {
        throw new Error('Failed to update preference');
      }
    } catch (error) {
      console.error('Error toggling keyword-source:', error);
      toast({
        title: "Error",
        description: "Failed to update keyword-source preference",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Get status icon for automation
  const getAutomationIcon = (automationEnabled: boolean, automationConfigured: boolean) => {
    if (automationConfigured && automationEnabled) {
      return <Zap className="h-4 w-4 text-green-600" />;
    } else if (automationConfigured && !automationEnabled) {
      return <ZapOff className="h-4 w-4 text-red-600" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  // Get status text for automation
  const getAutomationStatus = (automationEnabled: boolean, automationConfigured: boolean) => {
    if (automationConfigured && automationEnabled) {
      return { text: 'Active', variant: 'default' as const };
    } else if (automationConfigured && !automationEnabled) {
      return { text: 'Disabled', variant: 'destructive' as const };
    } else {
      return { text: 'Not Configured', variant: 'secondary' as const };
    }
  };

  const filteredKeywords = getAllKeywords().filter(keyword =>
    (keyword || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading keyword-source preferences...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Keyword × Source Management: {userName}
          </DialogTitle>
          <DialogDescription>
            Configure automation and display preferences for each keyword and source combination
          </DialogDescription>
        </DialogHeader>
        
        {/* Debug info */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-blue-800">
            🔧 Debug: Dialog is open for user {userId} ({userName})
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Last refreshed: {new Date().toLocaleTimeString()} | Keywords: {keywords.length} | Preferences: {preferences.length}
          </p>
        </div>

        <div className="space-y-6">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={fetchData} 
              variant="outline" 
              size="sm"
              disabled={loading || isUpdating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Keywords and Sources Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Keyword × Source Configuration</CardTitle>
              <CardDescription>
                {filteredKeywords.length} keywords found. Toggle fetching on/off for each keyword-source combination.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Keyword</TableHead>
                      {Object.entries(SOURCE_CONFIG).map(([sourceType, config]) => {
                        const IconComponent = config.icon;
                        return (
                          <TableHead key={sourceType} className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className={`p-1 rounded ${config.color}`}>
                                <IconComponent className="h-4 w-4" />
                              </div>
                              <div className="text-xs font-medium">{config.name}</div>
                            </div>
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKeywords.map((keyword) => (
                      <TableRow key={keyword}>
                        <TableCell className="font-medium">
                          <Badge variant="outline" className="text-sm">{keyword}</Badge>
                        </TableCell>
                        {Object.entries(SOURCE_CONFIG).map(([sourceType, config]) => {
                          const preference = getPreferencesForKeyword(keyword).find(p => p.source_type === sourceType);
                          const isEnabled = preference?.automation_enabled ?? false;
                          const isConfigured = preference?.automation_configured ?? false;
                          const isActive = isEnabled && isConfigured;

                          return (
                            <TableCell key={`${keyword}-${sourceType}`} className="text-center">
                              <div className="flex flex-col items-center gap-2">
                                <Switch
                                  checked={isActive}
                                  onCheckedChange={(checked) => 
                                    toggleKeywordSource(keyword, sourceType, checked)
                                  }
                                  disabled={isUpdating}
                                  className="data-[state=checked]:bg-green-600"
                                />
                                <div className="text-xs text-gray-500">
                                  {isActive ? (
                                    <span className="text-green-600 font-medium">Active</span>
                                  ) : isConfigured ? (
                                    <span className="text-yellow-600 font-medium">Configured</span>
                                  ) : (
                                    <span className="text-gray-400">Not Set</span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredKeywords.length}
                  </div>
                  <div className="text-sm text-gray-500">Keywords</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {preferences.filter(p => p.automation_enabled && p.automation_configured).length}
                  </div>
                  <div className="text-sm text-gray-500">Active Automation</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {preferences.filter(p => !p.automation_enabled && p.automation_configured).length}
                  </div>
                  <div className="text-sm text-gray-500">Disabled Automation</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {preferences.filter(p => !p.automation_configured).length}
                  </div>
                  <div className="text-sm text-gray-500">Not Configured</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
