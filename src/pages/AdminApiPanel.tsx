import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, EyeOff, Save, ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { SOURCES } from "@/config/sources";

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

  const getSourceStatus = (sourceName: string) => {
    const apiKey = apiKeys.find(key => key.source_name === sourceName);
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">API Management</h1>
            <p className="text-muted-foreground">
              Configure API keys for external data sources
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {Object.values(SOURCES).map((source) => {
            const apiKey = apiKeys.find(key => key.source_name === source.name);
            const status = getSourceStatus(source.name);

            return (
              <Card key={source.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <source.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{source.name}</CardTitle>
                        <CardDescription>{source.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status.status)}
                      <Badge variant={status.status === 'active' ? 'default' : 'secondary'}>
                        {status.message}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!apiKey ? (
                    <div className="text-center p-4 border rounded-lg bg-muted/20">
                      <p className="text-sm text-muted-foreground mb-3">
                        No API key record exists for {source.name}
                      </p>
                      <Button onClick={() => createApiKey(source.name)}>
                        Create API Key Record
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`key-${apiKey.id}`}>API Key</Label>
                        <div className="flex gap-2">
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
                            placeholder="Enter API key..."
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                          >
                            {visibleKeys.has(apiKey.id) ? 
                              <EyeOff className="w-4 h-4" /> : 
                              <Eye className="w-4 h-4" />
                            }
                          </Button>
                          <Button
                            onClick={() => updateApiKey(apiKey.id, { api_key: apiKey.api_key })}
                            disabled={saving === apiKey.id}
                          >
                            {saving === apiKey.id ? (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                Saving...
                              </div>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor={`active-${apiKey.id}`}>Active</Label>
                        <Switch
                          id={`active-${apiKey.id}`}
                          checked={apiKey.is_active}
                          onCheckedChange={(checked) => 
                            updateApiKey(apiKey.id, { is_active: checked })
                          }
                        />
                      </div>

                      {source.configFields?.map((field) => (
                        <div key={field.name}>
                          <Label htmlFor={`${field.name}-${apiKey.id}`}>
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
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}