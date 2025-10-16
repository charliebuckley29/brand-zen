import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import {
  RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, 
  Activity, Bell, BellOff, Eye, EyeOff, Loader2, Info, Search, Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { createApiUrl } from '@/lib/api';

interface SystemAlert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  source: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  metadata?: any;
  escalation_level: number;
  notification_sent: boolean;
  notification_channels: string[];
}

interface AlertSummary {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface AlertData {
  alerts: SystemAlert[];
  summary: AlertSummary;
}

export function AlertDashboard() {
  const [alertData, setAlertData] = useState<AlertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);


    try {
      const response = await fetch(createApiUrl('/admin/alerts/active?limit=100&hours=24'));
      const result = await response.json();

      if (result.success) {
        setAlertData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch alerts');
      }

      setLastRefresh(new Date());
    } catch (err: any) {
      console.error("Error fetching alert data:", err);
      setError(err.message);
      toast({
        title: "Error fetching alert data",
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

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(createApiUrl(`/admin/alerts/${alertId}/acknowledge`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledgedBy: 'admin' }) // TODO: Get actual user ID
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Alert acknowledged",
          description: "Alert has been acknowledged successfully",
        });
        fetchData(); // Refresh data
      } else {
        throw new Error(result.error || 'Failed to acknowledge alert');
      }
    } catch (err: any) {
      toast({
        title: "Error acknowledging alert",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(createApiUrl(`/admin/alerts/${alertId}/resolve`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy: 'admin' }) // TODO: Get actual user ID
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Alert resolved",
          description: "Alert has been resolved successfully",
        });
        fetchData(); // Refresh data
      } else {
        throw new Error(result.error || 'Failed to resolve alert');
      }
    } catch (err: any) {
      toast({
        title: "Error resolving alert",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'suppressed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'low': return <Info className="h-4 w-4 text-blue-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredAlerts = alertData?.alerts.filter(alert => {
    const matchesSearch = (alert.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (alert.message || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (alert.alert_type || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  }) || [];

  if (loading && !alertData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading alert dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Alerts</h2>
          <p className="text-muted-foreground">
            Monitor and manage system alerts and notifications
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
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Error loading alert data</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Alert Summary */}
      {alertData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alertData.summary.total}</div>
              <p className="text-xs text-muted-foreground">
                Last 24 hours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{alertData.summary.active}</div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{alertData.summary.critical}</div>
              <p className="text-xs text-muted-foreground">
                Immediate action required
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{alertData.summary.resolved}</div>
              <p className="text-xs text-muted-foreground">
                Successfully resolved
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Severity Breakdown */}
      {alertData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{alertData.summary.critical}</div>
              <p className="text-xs text-muted-foreground">Critical</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-orange-600">{alertData.summary.high}</div>
              <p className="text-xs text-muted-foreground">High</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{alertData.summary.medium}</div>
              <p className="text-xs text-muted-foreground">Medium</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{alertData.summary.low}</div>
              <p className="text-xs text-muted-foreground">Low</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="suppressed">Suppressed</option>
        </select>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>System Alerts</CardTitle>
          <CardDescription>
            {filteredAlerts.length} alerts found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{alert.title}</h3>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <Badge className={getStatusColor(alert.status)}>
                          {alert.status}
                        </Badge>
                        {alert.escalation_level > 0 && (
                          <Badge variant="outline">
                            Escalated (Level {alert.escalation_level})
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Type: {alert.alert_type}</span>
                        <span>Source: {alert.source}</span>
                        <span>Created: {formatDistanceToNow(parseISO(alert.created_at))} ago</span>
                        {alert.resolved_at && (
                          <span>Resolved: {formatDistanceToNow(parseISO(alert.resolved_at))} ago</span>
                        )}
                      </div>
                      {alert.metadata && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <details>
                            <summary className="cursor-pointer">View Details</summary>
                            <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto">
                              {JSON.stringify(alert.metadata, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.status === 'active' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Acknowledge
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      </>
                    )}
                    {alert.status === 'acknowledged' && (
                      <Button
                        size="sm"
                        onClick={() => handleResolveAlert(alert.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredAlerts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No alerts found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
