import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import {
  RefreshCw, Play, Pause, AlertTriangle, CheckCircle, XCircle, Clock, 
  Activity, Settings, History, Zap, Loader2, Info, Search, Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { createApiUrl } from '@/lib/api';

interface RecoveryStatus {
  isRunning: boolean;
  lastCheck: string | null;
  pendingActions: number;
  completedActions: number;
  failedActions: number;
}

interface RecoveryAction {
  id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  error_message?: string;
  metadata?: any;
  retry_count: number;
  max_retries: number;
  recovery_rules?: {
    name: string;
    description: string;
    trigger_condition: string;
    action_type: string;
  };
}

interface RecoveryRule {
  id: string;
  name: string;
  description: string;
  trigger_condition: string;
  action_type: string;
  target_type: string;
  enabled: boolean;
  priority: number;
  max_retries: number;
  retry_delay_minutes: number;
  created_at: string;
}

interface RecoveryActionsData {
  actions: RecoveryAction[];
  summary: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
}

export function AutomatedRecoveryDashboard() {
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus | null>(null);
  const [recoveryActions, setRecoveryActions] = useState<RecoveryActionsData | null>(null);
  const [recoveryRules, setRecoveryRules] = useState<RecoveryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);


    try {
      // Fetch recovery status
      const statusResponse = await fetch(createApiUrl('/admin/recovery/status'));
      const statusResult = await statusResponse.json();

      // Fetch recovery actions
      const actionsResponse = await fetch(createApiUrl('/admin/recovery/actions?limit=100&hours=24'));
      const actionsResult = await actionsResponse.json();

      // Fetch recovery rules
      const rulesResponse = await fetch(createApiUrl('/admin/recovery/rules'));
      const rulesResult = await rulesResponse.json();

      if (statusResult.success) {
        setRecoveryStatus(statusResult.data);
      } else {
        throw new Error(statusResult.error || 'Failed to fetch recovery status');
      }

      if (actionsResult.success) {
        setRecoveryActions(actionsResult.data);
      } else {
        throw new Error(actionsResult.error || 'Failed to fetch recovery actions');
      }

      if (rulesResult.success) {
        setRecoveryRules(rulesResult.data);
      } else {
        throw new Error(rulesResult.error || 'Failed to fetch recovery rules');
      }

      setLastRefresh(new Date());
    } catch (err: any) {
      console.error("Error fetching recovery data:", err);
      setError(err.message);
      toast({
        title: "Error fetching recovery data",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleTriggerRecovery = async () => {
    try {
      const response = await fetch(createApiUrl('/admin/recovery/trigger'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'manual_trigger',
          targetType: 'system',
          targetId: 'manual'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Recovery triggered",
          description: `Actions triggered: ${result.data.actionsTriggered}, Completed: ${result.data.actionsCompleted}`,
        });
        fetchData(); // Refresh data
      } else {
        throw new Error(result.error || 'Failed to trigger recovery');
      }
    } catch (err: any) {
      toast({
        title: "Error triggering recovery",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'running': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const filteredActions = recoveryActions?.actions.filter(action => {
    const matchesSearch = action.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         action.target_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         action.target_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || action.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  if (loading && !recoveryStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading recovery dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automated Recovery System</h2>
          <p className="text-muted-foreground">
            Monitor and manage automated recovery actions for queue failures
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-sm text-muted-foreground">
              Last updated: {formatDistanceToNow(lastRefresh)} ago
            </span>
          )}
          <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleTriggerRecovery} size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Trigger Recovery
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Error loading recovery data</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Status Overview */}
      {recoveryStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={recoveryStatus.isRunning ? "default" : "secondary"}>
                  {recoveryStatus.isRunning ? "Running" : "Stopped"}
                </Badge>
              </div>
              {recoveryStatus.lastCheck && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last check: {formatDistanceToNow(parseISO(recoveryStatus.lastCheck))} ago
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recoveryStatus.pendingActions}</div>
              <p className="text-xs text-muted-foreground">
                Waiting to be processed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{recoveryStatus.completedActions}</div>
              <p className="text-xs text-muted-foreground">
                Successfully recovered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{recoveryStatus.failedActions}</div>
              <p className="text-xs text-muted-foreground">
                Require manual intervention
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="actions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="actions">Recovery Actions</TabsTrigger>
          <TabsTrigger value="rules">Recovery Rules</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-4">
          {/* Actions Summary */}
          {recoveryActions && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{recoveryActions.summary.total}</div>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-yellow-600">{recoveryActions.summary.pending}</div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-blue-600">{recoveryActions.summary.running}</div>
                  <p className="text-xs text-muted-foreground">Running</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600">{recoveryActions.summary.completed}</div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-red-600">{recoveryActions.summary.failed}</div>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-gray-600">{recoveryActions.summary.cancelled}</div>
                  <p className="text-xs text-muted-foreground">Cancelled</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search actions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Actions List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Recovery Actions</CardTitle>
              <CardDescription>
                {filteredActions.length} actions found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(action.status)}
                      <div>
                        <div className="font-medium">
                          {action.recovery_rules?.name || action.action_type}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {action.target_type}: {action.target_id}
                        </div>
                        {action.recovery_rules?.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {action.recovery_rules.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(action.status)}>
                        {action.status}
                      </Badge>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>Started: {formatDistanceToNow(parseISO(action.started_at))} ago</div>
                        {action.completed_at && (
                          <div>Completed: {formatDistanceToNow(parseISO(action.completed_at))} ago</div>
                        )}
                        {action.error_message && (
                          <div className="text-red-600 mt-1">{action.error_message}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredActions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No recovery actions found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recovery Rules</CardTitle>
              <CardDescription>
                Configure automated recovery triggers and actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recoveryRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-sm text-muted-foreground">{rule.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Trigger: {rule.trigger_condition} | Action: {rule.action_type} | Priority: {rule.priority}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={rule.enabled ? "default" : "secondary"}>
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                ))}
                {recoveryRules.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No recovery rules configured
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recovery System Settings</CardTitle>
              <CardDescription>
                Configure automated recovery system behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Automated Recovery</div>
                    <div className="text-sm text-muted-foreground">
                      Automatically detect and recover from queue failures
                    </div>
                  </div>
                  <Badge variant={recoveryStatus?.isRunning ? "default" : "secondary"}>
                    {recoveryStatus?.isRunning ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Check Interval</div>
                    <div className="text-sm text-muted-foreground">
                      How often to check for recovery conditions
                    </div>
                  </div>
                  <span className="text-sm">2 minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Max Retries</div>
                    <div className="text-sm text-muted-foreground">
                      Maximum number of retry attempts per action
                    </div>
                  </div>
                  <span className="text-sm">3 attempts</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
