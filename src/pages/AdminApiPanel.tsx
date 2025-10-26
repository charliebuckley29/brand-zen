import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Eye, EyeOff, Save, ArrowLeft, CheckCircle, XCircle, AlertCircle, ChevronDown, Info, Zap, AlertTriangle, Settings, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { SOURCES, SOURCE_CATEGORIES } from "@/config/sources";
import { AdminQuotaManagerV2 } from "@/components/AdminQuotaManagerV2";
import { AdminLayout } from "@/components/ui/admin-layout";

type ApiKey = {
  id: string;
  source_name: string;
  api_key: string | null;
  additional_config: any;
  is_active: boolean;
};

export default function AdminApiPanel() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'api-keys' | 'quota-management'>('api-keys');

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      fetchApiKeys();
    } else if (!roleLoading && !isAdmin) {
      setLoading(false);
    }
  }, [isAdmin, roleLoading]);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('source_name');

      if (error) throw error;

      setApiKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  const updateApiKey = async (id: string, updates: Partial<ApiKey>) => {
    try {
      setSaving(id);
      const { error } = await supabase
        .from('api_keys')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setApiKeys(prev => prev.map(key => 
        key.id === id ? { ...key, ...updates } : key
      ));

      toast.success('API key updated successfully');
    } catch (error) {
      console.error('Error updating API key:', error);
      toast.error('Failed to update API key');
    } finally {
      setSaving(null);
    }
  };

  const createApiKey = async (sourceName: string) => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .insert([{ source_name: sourceName }])
        .select()
        .single();

      if (error) throw error;

      setApiKeys(prev => [...prev, data]);
      toast.success('API key record created');
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Failed to create API key record');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const toggleSourceExpanded = (sourceName: string) => {
    setExpandedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sourceName)) {
        newSet.delete(sourceName);
      } else {
        newSet.add(sourceName);
      }
      return newSet;
    });
  };

  // Map SOURCES names to database source_name values
  const getDbSourceName = (sourceName: string) => {
    const mapping: Record<string, string> = {
      'news': 'gnews',
      'reddit': 'reddit',
      'youtube': 'youtube', 
      'web': 'google_cse',
      'x': 'x_twitter',
      'google_alert': 'google_alert'
    };
    return mapping[sourceName] || sourceName;
  };

  const getSourceStatus = (sourceName: string) => {
    const dbSourceName = getDbSourceName(sourceName);
    const apiKey = apiKeys.find(key => key.source_name === dbSourceName);
    if (!apiKey) return { status: 'missing', message: 'Not configured' };
    if (!apiKey.is_active) return { status: 'inactive', message: 'Inactive' };
    if (!apiKey.api_key) return { status: 'empty', message: 'No API key' };
    return { status: 'active', message: 'Active' };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'empty': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">
              You need admin privileges to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminLayout
      title="API Management"
      description="Configure API keys for external data sources"
    >

        {/* Tab Navigation */}
        <div className="border-b">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('api-keys')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'api-keys'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                API Keys
              </div>
            </button>
            <button
              onClick={() => setActiveTab('quota-management')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'quota-management'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Quota Management
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'api-keys' && (
          <div className="grid gap-6">
          {Object.values(SOURCES).map((source) => {
            const dbSourceName = getDbSourceName(source.id);
            const apiKey = apiKeys.find(key => key.source_name === dbSourceName);
            const status = getSourceStatus(source.id);
            const category = SOURCE_CATEGORIES[source.category];
            const isExpanded = expandedSources.has(source.name);

            return (
              <Card key={source.name}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleSourceExpanded(source.name)}>
                  <CardHeader className="pb-4">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <source.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{source.name}</CardTitle>
                              <Badge variant="outline" className="text-xs">
                                {category.name}
                              </Badge>
                            </div>
                            <CardDescription className="flex items-center gap-2">
                              {source.description}
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status.status)}
                          <Badge variant={status.status === 'active' ? 'default' : 'secondary'}>
                            {status.message}
                          </Badge>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-6">
                      {/* Source Information */}
                      <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <Info className="w-3 h-3" />
                            API Information
                          </h4>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p><span className="font-medium">Provider:</span> {source.apiProvider || 'Not specified'}</p>
                            <p><span className="font-medium">Status:</span> {source.implemented ? 'Implemented' : 'Planned'}</p>
                            {source.implementationNotes && (
                              <p><span className="font-medium">Notes:</span> {source.implementationNotes}</p>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <Zap className="w-3 h-3" />
                            Coverage Examples
                          </h4>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {source.examples.slice(0, 3).map((example, idx) => (
                              <p key={idx}>• {example}</p>
                            ))}
                            {source.examples.length > 3 && (
                              <p className="text-xs opacity-70">+{source.examples.length - 3} more...</p>
                            )}
                          </div>
                        </div>
                        
                        {source.limitations && (
                          <div className="md:col-span-2">
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                              <AlertTriangle className="w-3 h-3" />
                              Limitations
                            </h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {source.limitations.map((limitation, idx) => (
                                <p key={idx}>• {limitation}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* API Configuration */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm border-b pb-2">API Configuration</h4>
                        
                        {!apiKey ? (
                          <div className="text-center p-6 border-2 border-dashed rounded-lg bg-muted/20">
                            <AlertCircle className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mb-3">
                              No API key record exists for {source.name}
                            </p>
                            <Button onClick={() => createApiKey(getDbSourceName(source.id))}>
                              Create API Key Record
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor={`key-${apiKey.id}`} className="text-sm font-medium">
                                API Key *
                              </Label>
                              <div className="flex gap-2 mt-1">
                                <Input
                                  id={`key-${apiKey.id}`}
                                  type={visibleKeys.has(apiKey.id) ? 'text' : 'password'}
                                  value={apiKey.api_key || ''}
                                  onChange={(e) => {
                                    setApiKeys(prev => prev.map(key => 
                                      key.id === apiKey.id 
                                        ? { ...key, api_key: e.target.value }
                                        : key
                                    ));
                                  }}
                                  placeholder={`Enter ${source.name} API key...`}
                                  className="font-mono text-sm"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => toggleKeyVisibility(apiKey.id)}
                                  type="button"
                                >
                                  {visibleKeys.has(apiKey.id) ? 
                                    <EyeOff className="w-4 h-4" /> : 
                                    <Eye className="w-4 h-4" />
                                  }
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <Label htmlFor={`active-${apiKey.id}`} className="text-sm font-medium">
                                  Enable API Source
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {apiKey.is_active ? 'This source is active and will fetch data' : 'This source is disabled'}
                                </p>
                              </div>
                              <Switch
                                id={`active-${apiKey.id}`}
                                checked={apiKey.is_active}
                                onCheckedChange={(checked) => 
                                  updateApiKey(apiKey.id, { is_active: checked })
                                }
                              />
                            </div>

                            {source.configFields && source.configFields.length > 0 && (
                              <div className="space-y-3">
                                <Label className="text-sm font-medium">Additional Configuration</Label>
                                {source.configFields.map((field) => (
                                  <div key={field.name}>
                                    <Label htmlFor={`${field.name}-${apiKey.id}`} className="text-xs text-muted-foreground">
                                      {field.label}
                                    </Label>
                                    <Input
                                      id={`${field.name}-${apiKey.id}`}
                                      value={apiKey.additional_config?.[field.name] || ''}
                                      onChange={(e) => {
                                        const newConfig = {
                                          ...apiKey.additional_config,
                                          [field.name]: e.target.value
                                        };
                                        setApiKeys(prev => prev.map(key => 
                                          key.id === apiKey.id 
                                            ? { ...key, additional_config: newConfig }
                                            : key
                                        ));
                                      }}
                                      placeholder={field.placeholder}
                                      className="mt-1"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex gap-2 pt-2">
                              <Button
                                onClick={() => updateApiKey(apiKey.id, { 
                                  api_key: apiKey.api_key,
                                  additional_config: apiKey.additional_config 
                                })}
                                disabled={saving === apiKey.id}
                                className="flex-1"
                              >
                                {saving === apiKey.id ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                    Saving Changes...
                                  </div>
                                ) : (
                                  <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Configuration
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
        )}

        {activeTab === 'quota-management' && (
          <AdminQuotaManager />
        )}
    </AdminLayout>
  );
}