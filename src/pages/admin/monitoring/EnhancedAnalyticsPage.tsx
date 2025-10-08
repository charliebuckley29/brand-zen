import { useUserRole } from "../../../hooks/use-user-role";
import { AdminLayout } from "../../../components/ui/admin-layout";
import { EnhancedAnalyticsDashboard } from "../../../components/admin/EnhancedAnalyticsDashboard";
import { Button } from "../../../components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function EnhancedAnalyticsPage() {
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <AdminLayout
        title="Enhanced Analytics"
        description="Loading analytics dashboard..."
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
        title="Enhanced Analytics"
        description="Access denied"
      >
        <div className="text-center py-12">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Enhanced Analytics"
      description="AI-powered predictive insights, trend analysis, and performance benchmarking"
      actions={
        <div className="flex gap-2">
          <Link to="/admin/monitoring">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Monitoring
            </Button>
          </Link>
        </div>
      }
    >
      <EnhancedAnalyticsDashboard />
    </AdminLayout>
  );
}
