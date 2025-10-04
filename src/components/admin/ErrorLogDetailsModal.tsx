import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { 
  ExternalLink, 
  Database, 
  Terminal, 
  Copy, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  User,
  Globe,
  FileText,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ErrorLogDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorLog: {
    id: string;
    timestamp: string;
    apiSource: string;
    userId: string;
    errorType: string;
    errorMessage: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    retryCount: number;
    stackTrace?: string;
    requestData?: any;
    responseData?: any;
    logLocations?: {
      vercelUrl: string;
      databaseId: string;
      consoleFilter: string;
      supportTicketId: string;
    };
    enhancedContext?: {
      environment: string;
      requestId: string;
      relatedErrors: string[];
      userAgent?: string;
      ipAddress?: string;
      queueStatus?: string;
      retryReason?: string;
      maxRetries?: number;
    };
    guidance?: {
      severity: 'auto-resolvable' | 'user-action' | 'support-required';
      instructions: string[];
      suggestedActions: string[];
    };
  } | null;
}

export function ErrorLogDetailsModal({ isOpen, onClose, errorLog }: ErrorLogDetailsModalProps) {
  const { toast } = useToast();

  if (!errorLog) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getGuidanceColor = (severity: string) => {
    switch (severity) {
      case 'auto-resolvable': return 'text-green-600';
      case 'user-action': return 'text-yellow-600';
      case 'support-required': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getGuidanceIcon = (severity: string) => {
    switch (severity) {
      case 'auto-resolvable': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'user-action': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'support-required': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const openVercelLogs = () => {
    if (errorLog.logLocations?.vercelUrl) {
      window.open(errorLog.logLocations.vercelUrl, '_blank');
    }
  };

  const copyLogId = () => {
    navigator.clipboard.writeText(errorLog.id);
    toast({
      title: "Log ID Copied",
      description: `Log ID ${errorLog.id} copied to clipboard`
    });
  };

  const copySupportTicketId = () => {
    if (errorLog.logLocations?.supportTicketId) {
      navigator.clipboard.writeText(errorLog.logLocations.supportTicketId);
      toast({
        title: "Support Ticket ID Copied",
        description: `Support Ticket ID ${errorLog.logLocations.supportTicketId} copied to clipboard`
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Error Log Details
          </DialogTitle>
          <DialogDescription>
            Detailed information about error log {errorLog.id}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Error Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Error Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Error Type</label>
                    <div className="font-mono text-sm">{errorLog.errorType}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Severity</label>
                    <div>
                      <Badge className={getSeverityColor(errorLog.severity)}>
                        {errorLog.severity}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">API Source</label>
                    <div className="font-medium">{errorLog.apiSource}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Retry Count</label>
                    <div className="font-medium">{errorLog.retryCount}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                    <div className="text-sm">{new Date(errorLog.timestamp).toLocaleString()}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User ID</label>
                    <div className="font-mono text-sm">{errorLog.userId}</div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Error Message</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm font-mono">
                    {errorLog.errorMessage}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Guidance */}
            {errorLog.guidance && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {getGuidanceIcon(errorLog.guidance.severity)}
                    Error Guidance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Resolution Type</label>
                    <div className={`font-medium capitalize ${getGuidanceColor(errorLog.guidance.severity)}`}>
                      {errorLog.guidance.severity.replace('-', ' ')}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Instructions</label>
                    <ul className="mt-1 space-y-1">
                      {errorLog.guidance.instructions.map((instruction, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <ArrowRight className="h-3 w-3 mt-1 text-muted-foreground" />
                          {instruction}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Suggested Actions</label>
                    <ul className="mt-1 space-y-1">
                      {errorLog.guidance.suggestedActions.map((action, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <Lightbulb className="h-3 w-3 mt-1 text-muted-foreground" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Log Access */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="h-5 w-5" />
                  Log Access
                </CardTitle>
                <CardDescription>
                  Access logs from different sources for this error
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {errorLog.logLocations?.vercelUrl && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Vercel Dashboard</div>
                          <div className="text-sm text-muted-foreground">Real-time function logs</div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={openVercelLogs}>
                        Open
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Database Logs</div>
                        <div className="text-sm text-muted-foreground">Persistent log storage</div>
                      </div>
                    </div>
                    <Badge variant="outline">ID: {errorLog.logLocations?.databaseId}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Terminal className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Console Logs</div>
                        <div className="text-sm text-muted-foreground">Browser developer tools</div>
                      </div>
                    </div>
                    <Badge variant="outline">Filter: {errorLog.logLocations?.consoleFilter}</Badge>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyLogId}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Log ID
                  </Button>
                  {errorLog.logLocations?.supportTicketId && (
                    <Button variant="outline" size="sm" onClick={copySupportTicketId}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Support ID
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Context Information */}
            {errorLog.enhancedContext && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Context Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Environment</label>
                      <div className="text-sm">{errorLog.enhancedContext.environment}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Request ID</label>
                      <div className="font-mono text-sm">{errorLog.enhancedContext.requestId}</div>
                    </div>
                    {errorLog.enhancedContext.queueStatus && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Queue Status</label>
                        <div className="text-sm">{errorLog.enhancedContext.queueStatus}</div>
                      </div>
                    )}
                    {errorLog.enhancedContext.retryReason && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Retry Reason</label>
                        <div className="text-sm">{errorLog.enhancedContext.retryReason}</div>
                      </div>
                    )}
                    {errorLog.enhancedContext.maxRetries && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Max Retries</label>
                        <div className="text-sm">{errorLog.enhancedContext.maxRetries}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stack Trace */}
            {errorLog.stackTrace && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Stack Trace</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-40">
                    <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto">
                      {errorLog.stackTrace}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
