import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  AlertTriangle, 
  AlertCircle,
  RefreshCw, 
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface AlertMonitoringProps {
  onRefresh: () => void;
  loading: boolean;
}

export function AlertMonitoring({ onRefresh, loading }: AlertMonitoringProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertStats, setAlertStats] = useState<any>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

  const fetchAlertData = async () => {
    try {
      // For now, use automation logs as alerts since we don't have a dedicated alerts endpoint
      const logsResponse = await fetch(`https://brandprotected.com/api/api/debug/logs?limit=50`);
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        // Convert logs to alert format
        const alertLogs = logsData.logs?.filter((log: any) => 
          log.event_type?.includes('error') || 
          log.event_type?.includes('failed') ||
          log.level === 'error'
        ).map((log: any) => ({
          id: log.id,
          timestamp: log.created_at,
          severity: log.level === 'error' ? 'high' : 'medium',
          type: log.event_type,
          message: log.message,
          source: 'system',
          status: 'open',
          details: log.error_details
        })) || [];
        setAlerts(alertLogs);
      } else {
        console.warn('Logs endpoint not available');
        setAlerts([]);
      }

      // Create mock alert stats from the logs
      const mockStats = {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      };
      setAlertStats(mockStats);
    } catch (error) {
      console.error('Error fetching alert data:', error);
      // Don't show toast for missing endpoints, just log the error
    }
  };

  useEffect(() => {
    fetchAlertData();
  }, [selectedTimeRange, selectedSeverity]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return XCircle;
      case 'high': return AlertTriangle;
      case 'medium': return AlertCircle;
      case 'low': return CheckCircle;
      default: return AlertCircle;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  const exportAlerts = () => {
    const csvContent = [
      ['Timestamp', 'Severity', 'Type', 'Message', 'Source', 'Status'],
      ...alerts.map(alert => [
        new Date(alert.timestamp).toISOString(),
        alert.severity,
        alert.type,
        alert.message,
        alert.source || 'N/A',
        alert.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Alert Statistics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alert Statistics Overview
          </CardTitle>
          <CardDescription>
            System alerts, warnings, and error monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                onClick={onRefresh} 
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              <Button 
                onClick={exportAlerts}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select 
                value={selectedSeverity} 
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select 
                value={selectedTimeRange} 
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>

          {alertStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {alertStats.critical || 0}
                </div>
                <div className="text-sm text-muted-foreground">Critical</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {alertStats.high || 0}
                </div>
                <div className="text-sm text-muted-foreground">High</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {alertStats.medium || 0}
                </div>
                <div className="text-sm text-muted-foreground">Medium</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {alertStats.low || 0}
                </div>
                <div className="text-sm text-muted-foreground">Low</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
          <CardDescription>
            Latest system alerts and notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.slice(0, 20).map((alert) => {
                const SeverityIcon = getSeverityIcon(alert.severity);
                return (
                  <Alert key={alert.id} variant={getSeverityColor(alert.severity)}>
                    <SeverityIcon className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getSeverityColor(alert.severity)}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <span className="text-sm font-medium">{alert.type}</span>
                            {alert.source && (
                              <span className="text-xs text-muted-foreground">
                                from {alert.source}
                              </span>
                            )}
                          </div>
                          <p className="text-sm">{alert.message}</p>
                          {alert.details && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              <details>
                                <summary className="cursor-pointer">Details</summary>
                                <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(alert.details, null, 2)}</pre>
                              </details>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <div className="text-xs text-muted-foreground">
                            {formatTimeAgo(alert.timestamp)}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {alert.status}
                          </Badge>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              })}
              {alerts.length > 20 && (
                <div className="text-center py-4 text-muted-foreground">
                  ... and {alerts.length - 20} more alerts
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No alerts found for the selected criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Trends */}
      {alertStats && alertStats.trends && (
        <Card>
          <CardHeader>
            <CardTitle>Alert Trends</CardTitle>
            <CardDescription>
              Alert frequency and patterns over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {alertStats.trends.totalAlerts || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Alerts</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {alertStats.trends.resolvedAlerts || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Resolved</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-lg font-bold text-red-600">
                    {alertStats.trends.openAlerts || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Open</div>
                </div>
              </div>
              
              {alertStats.trends.topSources && alertStats.trends.topSources.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Top Alert Sources</h4>
                  <div className="space-y-2">
                    {alertStats.trends.topSources.slice(0, 5).map((source: any) => (
                      <div key={source.name} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{source.name}</span>
                        <Badge variant="outline">{source.count} alerts</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

