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
  variants: string[] | null;
  google_alert_rss_url: string | null;
  google_alerts_enabled: boolean;
  created_at: string;
  updated_at: string;
  user_full_name: string;
}

interface KeywordSourceManagementProps {
  userId: string;
  userName: string;
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

export function KeywordSourceManagement({ userId, userName, onClose }: KeywordSourceManagementProps) {
  
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
      
      // Fetch user keywords
      const keywordsResponse = await apiFetch(`/admin/keywords-management?user_id=${userId}`);
      const keywordsData = await keywordsResponse.json();
      
      if (keywordsData.success) {
        setKeywords(keywordsData.data);
        
        // For each keyword, fetch source preferences
        const allPreferences: KeywordSourcePreference[] = [];
        
        for (const keyword of keywordsData.data) {
          // Get preferences for brand name
          const brandPrefsResponse = await apiFetch(`/keyword-source-preferences?userId=${userId}&keyword=${encodeURIComponent(keyword.brand_name)}`);
          const brandPrefsData = await brandPrefsResponse.json();
          
          if (brandPrefsData.success && brandPrefsData.data) {
            allPreferences.push(...brandPrefsData.data);
          }
          
          // Get preferences for variants
          if (keyword.variants && keyword.variants.length > 0) {
            for (const variant of keyword.variants) {
              const variantPrefsResponse = await apiFetch(`/keyword-source-preferences?userId=${userId}&keyword=${encodeURIComponent(variant)}`);
              const variantPrefsData = await variantPrefsResponse.json();
              
              if (variantPrefsData.success && variantPrefsData.data) {
                allPreferences.push(...variantPrefsData.data);
              }
            }
          }
        }
        
        setPreferences(allPreferences);
      }
    } catch (error) {
      console.error('Error fetching keyword-source data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch keyword-source preferences",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  // Get all unique keywords (brand name + variants)
  const getAllKeywords = () => {
    const allKeywords: string[] = [];
    
    keywords.forEach(keyword => {
      allKeywords.push(keyword.brand_name);
      if (keyword.variants) {
        allKeywords.push(...keyword.variants);
      }
    });
    
    return [...new Set(allKeywords)];
  };

  // Get preferences for a specific keyword
  const getPreferencesForKeyword = (keywordText: string) => {
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

      const response = await apiFetch('/keyword-source-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
    keyword.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
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
    <Dialog open={true} onOpenChange={onClose}>
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
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Keywords and Sources Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Keyword × Source Configuration</CardTitle>
              <CardDescription>
                {filteredKeywords.length} keywords found. Configure automation and display preferences for each combination.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-center">Automation</TableHead>
                      <TableHead className="text-center">Show in Mentions</TableHead>
                      <TableHead className="text-center">Show in Analytics</TableHead>
                      <TableHead className="text-center">Show in Reports</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKeywords.map((keyword) => (
                      <React.Fragment key={keyword}>
                        {Object.entries(SOURCE_CONFIG).map(([sourceType, config]) => {
                          const preference = getPreferencesForKeyword(keyword).find(p => p.source_type === sourceType);
                          const IconComponent = config.icon;
                          const automationStatus = getAutomationStatus(
                            preference?.automation_enabled ?? false,
                            preference?.automation_configured ?? false
                          );

                          return (
                            <TableRow key={`${keyword}-${sourceType}`}>
                              <TableCell className="font-medium">
                                <Badge variant="outline">{keyword}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className={`p-1 rounded ${config.color}`}>
                                    <IconComponent className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{config.name}</div>
                                    <div className="text-xs text-gray-500">{config.description}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {getAutomationIcon(
                                    preference?.automation_enabled ?? false,
                                    preference?.automation_configured ?? false
                                  )}
                                  <Badge variant={automationStatus.variant}>
                                    {automationStatus.text}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={preference?.show_in_mentions ?? true}
                                  onCheckedChange={(checked) => 
                                    updatePreference(keyword, sourceType, 'show_in_mentions', checked)
                                  }
                                  disabled={isUpdating}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={preference?.show_in_analytics ?? true}
                                  onCheckedChange={(checked) => 
                                    updatePreference(keyword, sourceType, 'show_in_analytics', checked)
                                  }
                                  disabled={isUpdating}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={preference?.show_in_reports ?? true}
                                  onCheckedChange={(checked) => 
                                    updatePreference(keyword, sourceType, 'show_in_reports', checked)
                                  }
                                  disabled={isUpdating}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Switch
                                    checked={preference?.automation_enabled ?? false}
                                    onCheckedChange={(checked) => 
                                      updatePreference(keyword, sourceType, 'automation_enabled', checked)
                                    }
                                    disabled={isUpdating || !preference?.automation_configured}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingPreference(preference || {
                                        id: '',
                                        user_id: userId,
                                        keyword,
                                        source_type: sourceType as any,
                                        automation_enabled: false,
                                        automation_configured: false,
                                        show_in_mentions: true,
                                        show_in_analytics: true,
                                        show_in_reports: true,
                                        source_url: null,
                                        created_at: '',
                                        updated_at: ''
                                      });
                                      setEditDialogOpen(true);
                                    }}
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
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
