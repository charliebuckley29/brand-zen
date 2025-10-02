import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { config } from '@/config/environment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Users, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface DefaultQuotaLimit {
  id: string;
  source_type: string;
  monthly_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserQuotaLimit {
  id: string;
  user_id: string;
  source_type: string;
  monthly_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  user_roles?: {
    user_type: string;
  };
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

interface QuotaAnalytics {
  period_days: number;
  current_month: string;
  overall_stats: {
    total_mentions: number;
    total_api_calls: number;
    total_users: number;
    total_limits: number;
    avg_mentions_per_user: number;
  };
  source_analytics: Array<{
    source_type: string;
    total_mentions: number;
    total_api_calls: number;
    unique_users: number;
    active_limits: number;
    current_month_mentions: number;
    avg_mentions_per_user: number;
  }>;
  top_users: Array<{
    user_id: string;
    full_name: string;
    total_mentions: number;
    total_api_calls: number;
    sources_used: string[];
    sources_count: number;
  }>;
}

const sourceDisplayNames: Record<string, string> = {
  youtube: 'YouTube',
  reddit: 'Reddit',
  x: 'X (Twitter)',
  google_alert: 'Google Alerts',
  rss_news: 'RSS News'
};

const sourceTypes = ['youtube', 'reddit', 'x', 'google_alert', 'rss_news'];

export function AdminQuotaManager() {
  const [quotaLimits, setQuotaLimits] = useState<UserQuotaLimit[]>([]);
  const [analytics, setAnalytics] = useState<QuotaAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [monthlyLimit, setMonthlyLimit] = useState<number>(1000);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [editingLimit, setEditingLimit] = useState<UserQuotaLimit | null>(null);
  const [users, setUsers] = useState<Array<{ user_id: string; full_name: string }>>([]);

  useEffect(() => {
    fetchQuotaData();
    fetchUsers();
    fetchAnalytics();
  }, []);

  const fetchQuotaData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.api.backendUrl}/api/admin/quota-limits`);
      const result = await response.json();

      if (result.success) {
        setQuotaLimits(result.data || []);
      } else {
        toast.error('Failed to fetch quota limits');
      }
    } catch (error) {
      console.error('Error fetching quota data:', error);
      toast.error('Failed to fetch quota data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${config.api.backendUrl}/api/admin/users`);
      const result = await response.json();

      if (result.success) {
        setUsers(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${config.api.backendUrl}/api/admin/quota-analytics?days=30`);
      const result = await response.json();

      if (result.success) {
        setAnalytics(result.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const createQuotaLimit = async () => {
    if (!selectedUser || !selectedSource || monthlyLimit < 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving('create');
      const response = await fetch(`${config.api.backendUrl}/api/admin/quota-limits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser,
          source_type: selectedSource,
          monthly_limit: monthlyLimit,
          is_active: isActive
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Quota limit created successfully');
        fetchQuotaData();
        resetForm();
      } else {
        toast.error(result.error || 'Failed to create quota limit');
      }
    } catch (error) {
      console.error('Error creating quota limit:', error);
      toast.error('Failed to create quota limit');
    } finally {
      setSaving(null);
    }
  };

  const updateQuotaLimit = async () => {
    if (!editingLimit) return;

    try {
      setSaving(editingLimit.id);
      const response = await fetch(`${config.api.backendUrl}/api/admin/quota-limits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingLimit.id,
          monthly_limit: monthlyLimit,
          is_active: isActive
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Quota limit updated successfully');
        fetchQuotaData();
        setEditingLimit(null);
        resetForm();
      } else {
        toast.error(result.error || 'Failed to update quota limit');
      }
    } catch (error) {
      console.error('Error updating quota limit:', error);
      toast.error('Failed to update quota limit');
    } finally {
      setSaving(null);
    }
  };

  const deleteQuotaLimit = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quota limit?')) return;

    try {
      setSaving(id);
      const response = await fetch(`${config.api.backendUrl}/api/admin/quota-limits?id=${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Quota limit deleted successfully');
        fetchQuotaData();
      } else {
        toast.error(result.error || 'Failed to delete quota limit');
      }
    } catch (error) {
      console.error('Error deleting quota limit:', error);
      toast.error('Failed to delete quota limit');
    } finally {
      setSaving(null);
    }
  };

  const resetForm = () => {
    setSelectedUser('');
    setSelectedSource('');
    setMonthlyLimit(1000);
    setIsActive(true);
    setEditingLimit(null);
  };

  const startEdit = (limit: UserQuotaLimit) => {
    setEditingLimit(limit);
    setSelectedUser(limit.user_id);
    setSelectedSource(limit.source_type);
    setMonthlyLimit(limit.monthly_limit);
    setIsActive(limit.is_active);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading quota management data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Mentions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overall_stats.total_mentions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overall_stats.total_users}</div>
              <p className="text-xs text-muted-foreground">With quota limits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Calls</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overall_stats.total_api_calls.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg per User</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overall_stats.avg_mentions_per_user}</div>
              <p className="text-xs text-muted-foreground">Mentions per user</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit Quota Limit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {editingLimit ? 'Edit Quota Limit' : 'Create Quota Limit'}
          </CardTitle>
          <CardDescription>
            {editingLimit ? 'Modify an existing quota limit' : 'Set monthly quota limits for users'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user">User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser} disabled={!!editingLimit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source Type</Label>
              <Select value={selectedSource} onValueChange={setSelectedSource} disabled={!!editingLimit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a source" />
                </SelectTrigger>
                <SelectContent>
                  {sourceTypes.map((source) => (
                    <SelectItem key={source} value={source}>
                      {sourceDisplayNames[source]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Monthly Limit</Label>
              <Input
                id="limit"
                type="number"
                min="0"
                max="100000"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(parseInt(e.target.value) || 0)}
                placeholder="1000"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isActive">Active</Label>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={editingLimit ? updateQuotaLimit : createQuotaLimit}
              disabled={!selectedUser || !selectedSource || saving !== null}
            >
              {saving === 'create' ? 'Creating...' : saving === editingLimit?.id ? 'Updating...' : 
               editingLimit ? 'Update Limit' : 'Create Limit'}
            </Button>
            
            {editingLimit && (
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quota Limits List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quota Limits</CardTitle>
              <CardDescription>Manage monthly quota limits for all users</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchQuotaData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {quotaLimits.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-sm text-gray-500">No quota limits configured</div>
            </div>
          ) : (
            <div className="space-y-4">
              {quotaLimits.map((limit) => (
                <div key={limit.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{limit.profiles?.full_name || 'Unknown User'}</span>
                      <Badge variant="outline">{sourceDisplayNames[limit.source_type]}</Badge>
                      {limit.user_roles?.user_type && (
                        <Badge variant="secondary">{limit.user_roles.user_type}</Badge>
                      )}
                      {!limit.is_active && <Badge variant="destructive">Inactive</Badge>}
                    </div>
                    <div className="text-sm text-gray-500">
                      {limit.profiles?.email && <span>{limit.profiles.email} • </span>}
                      Limit: {limit.monthly_limit.toLocaleString()} mentions/month
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(limit)}
                      disabled={saving === limit.id}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteQuotaLimit(limit.id)}
                      disabled={saving === limit.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
