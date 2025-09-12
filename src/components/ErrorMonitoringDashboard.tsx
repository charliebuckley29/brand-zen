import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Bug, 
  RefreshCw, 
  Trash2, 
  Download,
  Eye,
  EyeOff,
  Clock,
  Activity
} from 'lucide-react';
import { errorHandler, ErrorType, ErrorSeverity } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';

interface ErrorMonitoringDashboardProps {
  className?: string;
}

export const ErrorMonitoringDashboard: React.FC<ErrorMonitoringDashboardProps> = ({ 
  className 
}) => {
  const [stats, setStats] = useState(errorHandler.getErrorStats());
  const [selectedError, setSelectedError] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh stats
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setStats(errorHandler.getErrorStats());
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleClearQueue = () => {
    errorHandler.clearQueue();
    setStats(errorHandler.getErrorStats());
    logger.info('Error queue cleared');
  };

  const handleExportErrors = () => {
    const errors = errorHandler.getErrorStats().recent;
    const dataStr = JSON.stringify(errors, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'bg-red-100 text-red-800 border-red-200';
      case ErrorSeverity.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case ErrorSeverity.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case ErrorSeverity.LOW:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: ErrorType) => {
    switch (type) {
      case ErrorType.NETWORK:
        return 'bg-purple-100 text-purple-800';
      case ErrorType.AUTHENTICATION:
        return 'bg-red-100 text-red-800';
      case ErrorType.AUTHORIZATION:
        return 'bg-orange-100 text-orange-800';
      case ErrorType.VALIDATION:
        return 'bg-yellow-100 text-yellow-800';
      case ErrorType.NOT_FOUND:
        return 'bg-blue-100 text-blue-800';
      case ErrorType.SERVER:
        return 'bg-red-100 text-red-800';
      case ErrorType.CLIENT:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(timestamp);
  };

  // This component is now only shown in admin panel, so no need to hide in production

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Error Monitoring
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-green-50' : ''}
              >
                {autoRefresh ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {autoRefresh ? 'Auto' : 'Manual'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportErrors}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearQueue}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="recent">Recent Errors</TabsTrigger>
              <TabsTrigger value="details">Error Details</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Errors</p>
                        <p className="text-2xl font-bold">{stats.total}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Critical</p>
                        <p className="text-2xl font-bold text-red-600">
                          {stats.bySeverity[ErrorSeverity.CRITICAL]}
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">High</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {stats.bySeverity[ErrorSeverity.HIGH]}
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Medium</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {stats.bySeverity[ErrorSeverity.MEDIUM]}
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">By Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.byType).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <Badge className={getTypeColor(type as ErrorType)}>
                            {type}
                          </Badge>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">By Severity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.bySeverity).map(([severity, count]) => (
                        <div key={severity} className="flex items-center justify-between">
                          <Badge className={getSeverityColor(severity as ErrorSeverity)}>
                            {severity}
                          </Badge>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="recent" className="space-y-4">
              <div className="space-y-2">
                {stats.recent.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bug className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent errors</p>
                  </div>
                ) : (
                  stats.recent.map((error, index) => (
                    <Card 
                      key={index} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setSelectedError(error);
                        setShowDetails(true);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getSeverityColor(error.severity)}>
                                {error.severity}
                              </Badge>
                              <Badge className={getTypeColor(error.type)}>
                                {error.type}
                              </Badge>
                              {error.retryable && (
                                <Badge variant="outline" className="text-xs">
                                  Retryable
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium truncate">{error.message}</p>
                            {error.code && (
                              <p className="text-xs text-muted-foreground">Code: {error.code}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(error.timestamp)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              {selectedError ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bug className="h-5 w-5" />
                      Error Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Type</label>
                        <Badge className={getTypeColor(selectedError.type)}>
                          {selectedError.type}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Severity</label>
                        <Badge className={getSeverityColor(selectedError.severity)}>
                          {selectedError.severity}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Retryable</label>
                        <p className="text-sm">{selectedError.retryable ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                        <p className="text-sm">{selectedError.timestamp.toLocaleString()}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Message</label>
                      <p className="text-sm font-mono bg-muted p-2 rounded mt-1">
                        {selectedError.message}
                      </p>
                    </div>

                    {selectedError.code && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Code</label>
                        <p className="text-sm font-mono bg-muted p-2 rounded mt-1">
                          {selectedError.code}
                        </p>
                      </div>
                    )}

                    {selectedError.context && Object.keys(selectedError.context).length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Context</label>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(selectedError.context, null, 2)}
                        </pre>
                      </div>
                    )}

                    {selectedError.stack && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Stack Trace</label>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-40">
                          {selectedError.stack}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bug className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an error to view details</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
