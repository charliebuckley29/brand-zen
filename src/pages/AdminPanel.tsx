import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Eye, EyeOff, Save, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

type ApiKey = {
  id: string;
  source_name: string;
  api_key: string | null;
  additional_config: any;
  is_active: boolean;
};

export default function AdminPanel() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      fetchApiKeys();
    }
  }, [isAdmin, roleLoading]);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("source_name");
      
      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  const updateApiKey = async (id: string, updates: Partial<ApiKey>) => {
    setSaving(id);
    try {
      const { error } = await supabase
        .from("api_keys")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
      
      setApiKeys(prev => prev.map(key => 
        key.id === id ? { ...key, ...updates } : key
      ));
      
      toast.success("API key updated successfully");
    } catch (error) {
      console.error("Error updating API key:", error);
      toast.error("Failed to update API key");
    } finally {
      setSaving(null);
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

  const formatSourceName = (name: string) => {
    return name.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (roleLoading || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin panel.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to App
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage API keys and system configuration
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Key Management</CardTitle>
          <CardDescription>
            Configure API keys for different mention sources. Keep these secure and never share them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {apiKeys.map((keyConfig) => (
            <div key={keyConfig.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{formatSourceName(keyConfig.source_name)}</h3>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={keyConfig.is_active}
                    onCheckedChange={(checked) => 
                      updateApiKey(keyConfig.id, { is_active: checked })
                    }
                  />
                  <Label htmlFor={`active-${keyConfig.id}`} className="text-sm">
                    Active
                  </Label>
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor={`key-${keyConfig.id}`}>API Key</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id={`key-${keyConfig.id}`}
                      type={visibleKeys.has(keyConfig.id) ? "text" : "password"}
                      value={keyConfig.api_key || ""}
                      onChange={(e) => {
                        setApiKeys(prev => prev.map(key =>
                          key.id === keyConfig.id 
                            ? { ...key, api_key: e.target.value }
                            : key
                        ));
                      }}
                      placeholder="Enter API key..."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleKeyVisibility(keyConfig.id)}
                    >
                      {visibleKeys.has(keyConfig.id) ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Additional config fields based on source */}
                {keyConfig.source_name === 'google_cse' && (
                  <div>
                    <Label htmlFor={`cx-${keyConfig.id}`}>Custom Search Engine ID</Label>
                    <Input
                      id={`cx-${keyConfig.id}`}
                      value={keyConfig.additional_config?.cx_id || ""}
                      onChange={(e) => {
                        setApiKeys(prev => prev.map(key =>
                          key.id === keyConfig.id 
                            ? { 
                                ...key, 
                                additional_config: { 
                                  ...key.additional_config, 
                                  cx_id: e.target.value 
                                }
                              }
                            : key
                        ));
                      }}
                      placeholder="Enter Google CSE ID..."
                    />
                  </div>
                )}

                {keyConfig.source_name === 'reddit' && (
                  <div>
                    <Label htmlFor={`secret-${keyConfig.id}`}>Client Secret</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id={`secret-${keyConfig.id}`}
                        type={visibleKeys.has(`${keyConfig.id}-secret`) ? "text" : "password"}
                        value={keyConfig.additional_config?.client_secret || ""}
                        onChange={(e) => {
                          setApiKeys(prev => prev.map(key =>
                            key.id === keyConfig.id 
                              ? { 
                                  ...key, 
                                  additional_config: { 
                                    ...key.additional_config, 
                                    client_secret: e.target.value 
                                  }
                                }
                              : key
                          ));
                        }}
                        placeholder="Enter Reddit client secret..."
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleKeyVisibility(`${keyConfig.id}-secret`)}
                      >
                        {visibleKeys.has(`${keyConfig.id}-secret`) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => updateApiKey(keyConfig.id, {
                    api_key: keyConfig.api_key,
                    additional_config: keyConfig.additional_config
                  })}
                  disabled={saving === keyConfig.id}
                  className="w-fit"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving === keyConfig.id ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}