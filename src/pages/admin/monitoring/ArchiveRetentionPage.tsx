import { useUserRole } from "../../../hooks/use-user-role";
import { AdminLayout } from "../../../components/ui/admin-layout";
import ArchiveRetention from "../../../components/ArchiveRetention";
import { Button } from "../../../components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function ArchiveRetentionPage() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  if (roleLoading) {
    return (
      <AdminLayout
        title="Archive Retention"
        description="Loading archive retention data..."
      >
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading retention data...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout
        title="Archive Retention"
        description="Access denied"
      >
        <div className="text-center py-12">
          <div className="text-destructive mb-4">Access Denied</div>
          <p className="text-muted-foreground mb-4">You need admin privileges to access this page.</p>
          <Link to="/admin">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin Dashboard
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Archive Retention"
      description="Configure and manage data retention policies and archive settings"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <ArchiveRetention />
      </div>
    </AdminLayout>
  );
}
