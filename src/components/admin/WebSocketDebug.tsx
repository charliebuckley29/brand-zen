import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { useNotifications } from '@/hooks/useNotifications';
import { RealTimeIndicator } from './RealTimeIndicator';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Trash2,
  Settings,
  Bell,
  BellOff
} from 'lucide-react';

export function WebSocketDebug() {
  const { 
    data, 
    isConnected, 
    lastUpdate, 
    connectionAttempts, 
    error, 
    reconnect,
    getQueueHealth,
    getSystemHealth
  } = useRealTimeData();

  const {
    alerts,
    processedAlerts,
    notificationSettings,
    clearAllAlerts,
    updateNotificationSettings,
    getUnreadAlertsCount,
    getCriticalAlertsCount
  } = useNotifications();

  const queueHealth = getQueueHealth();
  const systemHealth = getSystemHealth();

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              WebSocket Connection Status
            </div>
            <RealTimeIndicator 
              isConnected={isConnected} 
              isConnecting={false} 
              lastUpdate={lastUpdate}
              connectionAttempts={connectionAttempts}
              error={error}
              onReconnect={reconnect}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              <div className="text-sm text-muted-foreground">Connection Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{connectionAttempts}</div>
              <div className="text-sm text-muted-foreground">Reconnection Attempts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Never'}
              </div>
              <div className="text-sm text-muted-foreground">Last Update</div>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-800">
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            System Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getHealthIcon(queueHealth)}
                <span className="font-medium">Queue Health</span>
              </div>
              <Badge variant="outline" className={getHealthColor(queueHealth)}>
                {queueHealth}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getHealthIcon(systemHealth)}
                <span className="font-medium">System Health</span>
              </div>
              <Badge variant="outline" className={getHealthColor(systemHealth)}>
                {systemHealth}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Real-Time Data Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold">
                {data.queueStatus ? 'Available' : 'Not Available'}
              </div>
              <div className="text-sm text-muted-foreground">Queue Status</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {data.systemHealth ? 'Available' : 'Not Available'}
              </div>
              <div className="text-sm text-muted-foreground">System Health</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {data.apiHealth ? 'Available' : 'Not Available'}
              </div>
              <div className="text-sm text-muted-foreground">API Health</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {data.sentimentUpdates ? 'Available' : 'Not Available'}
              </div>
              <div className="text-sm text-muted-foreground">Sentiment Updates</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alerts Management
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateNotificationSettings({ 
                  showCriticalOnly: !notificationSettings.showCriticalOnly 
                })}
              >
                {notificationSettings.showCriticalOnly ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                {notificationSettings.showCriticalOnly ? 'Critical Only' : 'All Alerts'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllAlerts}
                disabled={alerts.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{alerts.length}</div>
              <div className="text-sm text-muted-foreground">Total Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{getUnreadAlertsCount()}</div>
              <div className="text-sm text-muted-foreground">Unread Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{getCriticalAlertsCount()}</div>
              <div className="text-sm text-muted-foreground">Critical Alerts</div>
            </div>
          </div>

          {/* Recent Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <div className="text-sm font-medium">Recent Alerts</div>
              {alerts.slice(0, 5).map((alert, index) => (
                <div key={alert.id || index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                      {alert.severity}
                    </Badge>
                    <span className="text-sm">{alert.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold">{data.recoveryActions.length}</div>
              <div className="text-sm text-muted-foreground">Recovery Actions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{data.userActivity.length}</div>
              <div className="text-sm text-muted-foreground">User Activities</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Debug Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={reconnect}
              disabled={isConnected}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconnect WebSocket
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
