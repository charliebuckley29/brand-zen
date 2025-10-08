import { useUserRole } from "../../../hooks/use-user-role";
import { AdminLayout } from "../../../components/ui/admin-layout";
import { AutomatedRecoveryDashboard } from "../../../components/admin/AutomatedRecoveryDashboard";
import { Button } from "../../../components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function AutomatedRecoveryPage() {
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <AdminLayout
        title="Automated Recovery System"
        description="Loading recovery system dashboard..."
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
        title="Automated Recovery System"
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
      title="Automated Recovery System"
      description="Monitor and manage automated recovery actions for queue failures and system issues"
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
      <AutomatedRecoveryDashboard />
    </AdminLayout>
  );
}
