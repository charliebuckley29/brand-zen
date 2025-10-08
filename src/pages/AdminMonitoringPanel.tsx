import { useEffect } from "react";
import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle, RefreshCw, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/ui/admin-layout";

export default function AdminMonitoringPanel() {
  const { isAdmin, loading: roleLoading } = useUserRole();

  // Redirect to unified monitoring dashboard
  useEffect(() => {
    if (isAdmin) {
      window.location.href = '/admin/unified-monitoring';
    }
  }, [isAdmin]);

  if (roleLoading) {
    return (
      <AdminLayout
        title="System Monitoring"
        description="Loading..."
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
        title="System Monitoring"
        description="Access denied"
      >
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this page.
          </AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="System Monitoring"
      description="Redirecting to unified monitoring dashboard..."
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <RefreshCw className="h-4 w-4 animate-spin" />
            Redirecting to Unified Monitoring
          </CardTitle>
          <CardDescription>
            This legacy monitoring panel has been replaced with the new unified monitoring dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The old monitoring panel has been consolidated into a more comprehensive dashboard that includes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Real-time system health monitoring</li>
              <li>API usage and limits tracking</li>
              <li>User activity and quota management</li>
              <li>Queue status and processing metrics</li>
              <li>Performance analytics and trends</li>
              <li>Automated fetching status</li>
            </ul>
            <div className="pt-4">
              <Button onClick={() => window.location.href = '/admin/unified-monitoring'}>
                Go to Unified Monitoring
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}