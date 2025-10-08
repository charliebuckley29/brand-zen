import { useUserRole } from "../hooks/use-user-role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { AlertDashboard } from "@/components/admin/AlertDashboard";
import { AdminLayout } from "../components/ui/admin-layout";

export default function SystemAlertsPage() {
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <AdminLayout
        title="System Alerts"
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
        title="System Alerts"
        description="Access denied"
      >
        <div className="text-center py-12">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Access Denied</CardTitle>
              <CardDescription className="text-center">
                You need admin privileges to access this page.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="System Alerts"
      description="Monitor and manage system alerts, notifications, and escalation policies"
    >
      <AlertDashboard />
    </AdminLayout>
  );
}
