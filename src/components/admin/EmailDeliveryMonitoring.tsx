import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number;
  failureRate: number;
  retryStats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

interface TemplateBreakdown {
  template_id: string;
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
}

interface DailyBreakdown {
  date: string;
  total: number;
  sent: number;
  delivered: number;
  failed: number;
}

interface UserBreakdown {
  user_id: string;
  user_name: string;
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
}

interface RecentFailure {
  id: string;
  user_id: string;
  template_id: string;
  recipient_email: string;
  status: string;
  sent_at: string;
  error_message: string;
  profiles: {
    full_name: string;
  };
}

interface EmailDeliveryData {
  summary: EmailStats;
  templateBreakdown: TemplateBreakdown[];
  dailyBreakdown: DailyBreakdown[];
  userBreakdown: UserBreakdown[];
  recentFailures: RecentFailure[];
  retryQueue: any[];
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
}

export function EmailDeliveryMonitoring() {
  const [data, setData] = useState<EmailDeliveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        days: days.toString()
      });
      
      if (templateFilter !== 'all') {
        params.append('template_id', templateFilter);
      }

      const response = await fetch(`/api/admin/email-delivery-stats?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch email delivery data');
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days, templateFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Delivered</Badge>;
      case 'sent':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'failed':
      case 'bounced':
      case 'dropped':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTemplateName = (templateId: string) => {
    switch (templateId) {
      case 'negative_sentiment':
        return 'Negative Sentiment Alert';
      case 'daily_digest':
        return 'Daily Digest';
      case 'weekly_digest':
        return 'Weekly Digest';
      case 'welcome':
        return 'Welcome Email';
      default:
        return templateId;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Email Delivery Monitoring</h2>
          <Button onClick={fetchData} disabled>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Email Delivery Monitoring</h2>
          <Button onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Email Delivery Monitoring</h2>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No data available</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Delivery Monitoring</h2>
          <p className="text-muted-foreground">
            Last {data.dateRange.days} days ({new Date(data.dateRange.start).toLocaleDateString()} - {new Date(data.dateRange.end).toLocaleDateString()})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 day</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={templateFilter} onValueChange={setTemplateFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Templates</SelectItem>
              <SelectItem value="negative_sentiment">Negative Sentiment</SelectItem>
              <SelectItem value="daily_digest">Daily Digest</SelectItem>
              <SelectItem value="weekly_digest">Weekly Digest</SelectItem>
              <SelectItem value="welcome">Welcome</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.sent} sent, {data.summary.pending} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.summary.deliveryRate}%</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.delivered} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failure Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.summary.failureRate}%</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.failed} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retry Queue</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.retryStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.retryStats.pending} pending, {data.summary.retryStats.completed} completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Template Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Template Performance</CardTitle>
          <CardDescription>Email delivery statistics by template type</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Delivery Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.templateBreakdown.map((template) => (
                <TableRow key={template.template_id}>
                  <TableCell className="font-medium">
                    {getTemplateName(template.template_id)}
                  </TableCell>
                  <TableCell>{template.total}</TableCell>
                  <TableCell className="text-green-600">{template.delivered}</TableCell>
                  <TableCell className="text-red-600">{template.failed}</TableCell>
                  <TableCell>
                    <Badge variant={template.deliveryRate >= 90 ? "default" : template.deliveryRate >= 70 ? "secondary" : "destructive"}>
                      {template.deliveryRate}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Failures */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Failures</CardTitle>
          <CardDescription>Latest failed email deliveries</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentFailures.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recent failures</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentFailures.map((failure) => (
                  <TableRow key={failure.id}>
                    <TableCell className="font-medium">
                      {failure.profiles?.full_name || 'Unknown User'}
                    </TableCell>
                    <TableCell>{getTemplateName(failure.template_id)}</TableCell>
                    <TableCell className="text-sm">{failure.recipient_email}</TableCell>
                    <TableCell>{getStatusBadge(failure.status)}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(failure.sent_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-red-600 max-w-xs truncate">
                      {failure.error_message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Top Users */}
      <Card>
        <CardHeader>
          <CardTitle>Top Users by Email Volume</CardTitle>
          <CardDescription>Users with the most email activity</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Delivery Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.userBreakdown.slice(0, 10).map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">{user.user_name}</TableCell>
                  <TableCell>{user.total}</TableCell>
                  <TableCell className="text-green-600">{user.delivered}</TableCell>
                  <TableCell className="text-red-600">{user.failed}</TableCell>
                  <TableCell>
                    <Badge variant={user.deliveryRate >= 90 ? "default" : user.deliveryRate >= 70 ? "secondary" : "destructive"}>
                      {user.deliveryRate}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
