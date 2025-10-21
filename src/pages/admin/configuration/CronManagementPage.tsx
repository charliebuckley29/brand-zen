import { useUserRole } from "../../../hooks/use-user-role";
import { AdminLayout } from "../../../components/ui/admin-layout";
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "../../../components/ui/enhanced-card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Switch } from "../../../components/ui/switch";
import { createApiUrl, apiFetch } from "../../../lib/api";
import { 
  Clock, 
  Play, 
  Pause, 
  RefreshCw, 
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  History,
  Settings,
  Activity
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "../../../hooks/use-toast";

interface CronConfig {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  interval_minutes: number;
  last_run?: string;
  next_run?: string;
}

interface CronHistory {
  id: string;
  cron_name: string;
  triggered_at: string;
  status: 'started' | 'success' | 'error' | 'skipped';
  duration_ms: number;
  error_details?: any;
}

export default function CronManagementPage() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [cronConfigs, setCronConfigs] = useState<CronConfig[]>([]);
  const [cronHistory, setCronHistory] = useState<CronHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchCronData();
    }
  }, [isAdmin]);

  const fetchCronData = async () => {
    try {
      setLoading(true);
      
      // Fetch cron configurations
      const configResponse = await apiFetch('/admin/cron/config');
      const result = await configResponse.json();
      if (result.success && result.config) {
        // Transform the config object into an array format
        const configArray = Object.entries(result.config).map(([key, value]: [string, any]) => ({
          key,
          name: key.replace('cron.', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: `Cron job for ${key.replace('cron.', '').replace(/_/g, ' ')}`,
          enabled: value?.enabled || false,
          interval_minutes: value?.interval_minutes || 0
        }));
        setCronConfigs(configArray);
      } else {
        setCronConfigs([]);
      }

      // Fetch cron history
      const historyResponse = await apiFetch('/admin/cron/history?limit=20');
      const historyResult = await historyResponse.json();
      if (historyResult.success && Array.isArray(historyResult.history)) {
        setCronHistory(historyResult.history);
      } else {
        setCronHistory([]);
      }
    } catch (error) {
      console.error('Failed to fetch cron data:', error);
      toast({
        title: "Error",
        description: "Failed to load cron data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCron = async (cronKey: string, enabled: boolean) => {
    try {
      setUpdating(cronKey);
      
      const response = await apiFetch('/admin/cron/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [cronKey]: { enabled } })
      });

      if (response.ok) {
        setCronConfigs(prev => 
          prev.map(config => 
            config.key === cronKey ? { ...config, enabled } : config
          )
        );
        
        toast({
          title: "Success",
          description: `${cronKey} ${enabled ? 'enabled' : 'disabled'} successfully`,
        });
      } else {
        throw new Error('Failed to update cron configuration');
      }
    } catch (error) {
      console.error('Failed to toggle cron:', error);
      toast({
        title: "Error",
        description: "Failed to update cron configuration",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'skipped':
        return <Pause className="h-4 w-4 text-yellow-600" />;
      case 'started':
        return <Activity className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
      case 'error':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Error</Badge>;
      case 'skipped':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Skipped</Badge>;
      case 'started':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Started</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (roleLoading) {
    return (
      <AdminLayout
        title="Cron Management"
        description="Loading cron configuration..."
      >
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout
        title="Cron Management"
        description="Access denied"
      >
        <div className="text-center py-12">
          <EnhancedCard variant="elevated" className="w-full max-w-md mx-auto">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="text-center">Access Denied</EnhancedCardTitle>
              <EnhancedCardDescription className="text-center">
                You need admin privileges to access this page.
              </EnhancedCardDescription>
            </EnhancedCardHeader>
          </EnhancedCard>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Cron Management"
      description="Control and monitor automated cron job execution"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCronData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to="/admin/configuration">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Configuration
            </Button>
          </Link>
        </div>
      }
    >
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading cron data...</p>
        </div>
      ) : (
        <>
          {/* Cron Configuration */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Cron Job Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cronConfigs.map((config) => (
                <EnhancedCard key={config.key} variant="outlined">
                  <EnhancedCardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <EnhancedCardTitle size="lg">{config.name}</EnhancedCardTitle>
                          <EnhancedCardDescription>
                            {config.description}
                          </EnhancedCardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {config.enabled ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">Enabled</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-800">Disabled</Badge>
                        )}
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={(enabled) => toggleCron(config.key, enabled)}
                          disabled={updating === config.key}
                        />
                      </div>
                    </div>
                  </EnhancedCardHeader>
                  <EnhancedCardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Interval:</span>
                        <span>{config.interval_minutes} minutes</span>
                      </div>
                      {config.last_run && (
                        <div className="flex justify-between">
                          <span>Last Run:</span>
                          <span>{formatTimestamp(config.last_run)}</span>
                        </div>
                      )}
                      {config.next_run && (
                        <div className="flex justify-between">
                          <span>Next Run:</span>
                          <span>{formatTimestamp(config.next_run)}</span>
                        </div>
                      )}
                    </div>
                  </EnhancedCardContent>
                </EnhancedCard>
              ))}
            </div>
          </div>

          {/* Cron History */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Recent Execution History</h2>
            <EnhancedCard>
              <EnhancedCardHeader>
                <EnhancedCardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Execution Log
                </EnhancedCardTitle>
                <EnhancedCardDescription>
                  Last 20 cron job executions with status and timing
                </EnhancedCardDescription>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                {cronHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No cron execution history available
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cronHistory.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(entry.status)}
                          <div>
                            <div className="font-medium">{entry.cron_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatTimestamp(entry.triggered_at)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {formatDuration(entry.duration_ms)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Duration
                            </div>
                          </div>
                          {getStatusBadge(entry.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </EnhancedCardContent>
            </EnhancedCard>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
