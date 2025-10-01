import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp,
  BarChart3,
  RefreshCw,
  Users,
  Globe
} from 'lucide-react';

interface DefaultQuotaLimit {
  id: string;
  source_type: string;
  monthly_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EffectiveQuotaLimit {
  user_id: string;
  user_type: string;
  full_name: string;
  email: string;
  source_type: string;
  effective_limit: number;
  quota_type: 'default' | 'exception';
  exception_limit?: number;
  default_limit: number;
  exception_active?: boolean;
  exception_created_at?: string;
}

interface User {
  user_id: string;
  full_name: string;
  email: string;
  user_type: string;
}

const sourceDisplayNames: Record<string, string> = {
  youtube: 'YouTube',
  reddit: 'Reddit',
  x: 'X (Twitter)',
  google_alert: 'Google Alerts',
  rss_news: 'RSS News'
};

export function AdminQuotaManagerV2() {
  const [defaultQuotas, setDefaultQuotas] = useState<DefaultQuotaLimit[]>([]);
  const [effectiveQuotas, setEffectiveQuotas] = useState<EffectiveQuotaLimit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingDefault, setEditingDefault] = useState<DefaultQuotaLimit | null>(null);
  const [editingException, setEditingException] = useState<EffectiveQuotaLimit | null>(null);
  const [showCreateException, setShowCreateException] = useState(false);
  const [newException, setNewException] = useState({
    user_id: '',
    source_type: '',
    monthly_limit: 1000
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDefaultQuotas(),
        fetchEffectiveQuotas(),
        fetchUsers()
      ]);
    } catch (error) {
      console.error('Error fetching quota data:', error);
      toast.error('Failed to load quota data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaultQuotas = async () => {
    try {
      const response = await fetch('https://mentions-backend.vercel.app/api/api/admin/default-quotas');
      const result = await response.json();

      if (result.success) {
        setDefaultQuotas(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch default quotas');
      }
    } catch (error) {
      console.error('Error fetching default quotas:', error);
      toast.error('Failed to fetch default quotas');
    }
  };

  const fetchEffectiveQuotas = async () => {
    try {
      const response = await fetch('https://mentions-backend.vercel.app/api/api/admin/effective-quotas?quota_type=exception');
      const result = await response.json();

      if (result.success) {
        setEffectiveQuotas(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch effective quotas');
      }
    } catch (error) {
      console.error('Error fetching effective quotas:', error);
      toast.error('Failed to fetch effective quotas');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('https://mentions-backend.vercel.app/api/api/admin/users');
      const result = await response.json();

      if (result.success) {
        setUsers(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  };

  const updateDefaultQuota = async (sourceType: string, monthlyLimit: number) => {
    try {
      setSaving(sourceType);
      const response = await fetch('https://mentions-backend.vercel.app/api/api/admin/default-quotas', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_type: sourceType,
          monthly_limit: monthlyLimit
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchDefaultQuotas();
        toast.success(`Default quota for ${sourceDisplayNames[sourceType]} updated successfully`);
      } else {
        throw new Error(result.error || 'Failed to update default quota');
      }
    } catch (error) {
      console.error('Error updating default quota:', error);
      toast.error('Failed to update default quota');
    } finally {
      setSaving(null);
    }
  };

  const createUserException = async () => {
    try {
      setSaving('create');
      const response = await fetch('https://mentions-backend.vercel.app/api/api/admin/quota-limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: newException.user_id,
          source_type: newException.source_type,
          monthly_limit: newException.monthly_limit,
          is_active: true
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchEffectiveQuotas();
        setShowCreateException(false);
        setNewException({ user_id: '', source_type: '', monthly_limit: 1000 });
        toast.success('User quota exception created successfully');
      } else {
        throw new Error(result.error || 'Failed to create user exception');
      }
    } catch (error) {
      console.error('Error creating user exception:', error);
      toast.error('Failed to create user exception');
    } finally {
      setSaving(null);
    }
  };

  const deleteUserException = async (userId: string, sourceType: string) => {
    try {
      setSaving(`${userId}-${sourceType}`);
      const response = await fetch(`https://mentions-backend.vercel.app/api/api/admin/quota-limits?user_id=${userId}&source_type=${sourceType}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await fetchEffectiveQuotas();
        toast.success('User quota exception deleted successfully');
      } else {
        throw new Error(result.error || 'Failed to delete user exception');
      }
    } catch (error) {
      console.error('Error deleting user exception:', error);
      toast.error('Failed to delete user exception');
    } finally {
      setSaving(null);
    }
  };

  const getDefaultQuotaForSource = (sourceType: string) => {
    const defaultQuota = defaultQuotas.find(q => q.source_type === sourceType);
    return defaultQuota?.monthly_limit || 0;
  };

  const getExceptionsForSource = (sourceType: string) => {
    return effectiveQuotas.filter(q => q.source_type === sourceType && q.quota_type === 'exception');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading quota data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quota Management</h2>
          <p className="text-gray-600">Manage default quotas and user exceptions</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Default Quotas Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Default Quotas by Source
          </CardTitle>
          <CardDescription>
            Set the default monthly limits for each data source. These apply to all users unless they have individual exceptions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {defaultQuotas.map((quota) => (
            <div key={quota.source_type} className="flex items-center justify-between p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">{sourceDisplayNames[quota.source_type]}</span>
                  <Badge variant="outline">Default</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Current limit: {quota.monthly_limit.toLocaleString()} mentions/month
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={quota.monthly_limit}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value) || 0;
                    setDefaultQuotas(prev => prev.map(q => 
                      q.source_type === quota.source_type 
                        ? { ...q, monthly_limit: newLimit }
                        : q
                    ));
                  }}
                  className="w-32"
                  min="0"
                  max="100000"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateDefaultQuota(quota.source_type, quota.monthly_limit)}
                  disabled={saving === quota.source_type}
                >
                  {saving === quota.source_type ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Edit className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* User Exceptions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Quota Exceptions
          </CardTitle>
          <CardDescription>
            Individual users who have different quotas than the defaults.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">
              {effectiveQuotas.length} user exceptions across all sources
            </p>
            <Button onClick={() => setShowCreateException(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Exception
            </Button>
          </div>

          {/* Group exceptions by source */}
          {['youtube', 'reddit', 'x', 'google_alert', 'rss_news'].map(sourceType => {
            const exceptions = getExceptionsForSource(sourceType);
            const defaultLimit = getDefaultQuotaForSource(sourceType);
            
            if (exceptions.length === 0) return null;

            return (
              <div key={sourceType} className="mb-6">
                <h4 className="font-medium text-lg mb-3">
                  {sourceDisplayNames[sourceType]} Exceptions
                  <Badge variant="secondary" className="ml-2">
                    {exceptions.length} user{exceptions.length !== 1 ? 's' : ''}
                  </Badge>
                </h4>
                <div className="space-y-2">
                  {exceptions.map((exception) => (
                    <div key={`${exception.user_id}-${exception.source_type}`} className="flex items-center justify-between p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">{exception.full_name}</span>
                          <Badge variant="secondary">{exception.user_type}</Badge>
                          <span className="text-sm text-muted-foreground">{exception.email}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Exception: {exception.exception_limit?.toLocaleString()} mentions/month
                          <span className="ml-2 text-muted-foreground/70">
                            (Default: {exception.default_limit.toLocaleString()})
                          </span>
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteUserException(exception.user_id, exception.source_type)}
                        disabled={saving === `${exception.user_id}-${exception.source_type}`}
                      >
                        {saving === `${exception.user_id}-${exception.source_type}` ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {effectiveQuotas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No user exceptions found.</p>
              <p className="text-sm">All users are using the default quotas.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Exception Dialog */}
      <Dialog open={showCreateException} onOpenChange={setShowCreateException}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User Quota Exception</DialogTitle>
            <DialogDescription>
              Set a custom quota limit for a specific user and source.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-select">User</Label>
              <Select value={newException.user_id} onValueChange={(value) => setNewException(prev => ({ ...prev, user_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name} ({user.user_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="source-select">Source Type</Label>
              <Select value={newException.source_type} onValueChange={(value) => setNewException(prev => ({ ...prev, source_type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a source" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sourceDisplayNames).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="limit-input">Monthly Limit</Label>
              <Input
                id="limit-input"
                type="number"
                value={newException.monthly_limit}
                onChange={(e) => setNewException(prev => ({ ...prev, monthly_limit: parseInt(e.target.value) || 0 }))}
                min="0"
                max="100000"
                placeholder="Enter monthly limit"
              />
              {newException.source_type && (
                <p className="text-sm text-gray-500 mt-1">
                  Default limit for {sourceDisplayNames[newException.source_type]}: {getDefaultQuotaForSource(newException.source_type).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateException(false)}>
                Cancel
              </Button>
              <Button 
                onClick={createUserException}
                disabled={!newException.user_id || !newException.source_type || saving === 'create'}
              >
                {saving === 'create' ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Exception
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
