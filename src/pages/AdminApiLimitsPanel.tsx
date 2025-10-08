import { useEffect } from "react";
import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/ui/admin-layout";

export default function AdminApiLimitsPanel() {
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
        title="API Limits & Usage"
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
        title="API Limits & Usage"
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
      title="API Limits & Usage"
      description="Redirecting to unified monitoring dashboard..."
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Redirecting to Unified Monitoring
          </CardTitle>
          <CardDescription>
            This page has been consolidated into the unified monitoring dashboard for better user experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are being redirected to the new unified monitoring dashboard which includes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>API Limits and Status</li>
              <li>Usage Analytics and Trends</li>
              <li>User Quota Management</li>
              <li>System Health Monitoring</li>
              <li>Real-time Performance Metrics</li>
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