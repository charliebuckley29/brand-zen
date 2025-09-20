import { useUserRole } from "@/hooks/use-user-role";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminQuotaManagerV2 } from "@/components/AdminQuotaManagerV2";

export default function AdminUserQuotaManagement() {
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access this page.
          </p>
          <Link to="/dashboard" className="text-primary hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/admin"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Panel
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">User Quota Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage monthly quota limits and user exceptions for data sources
        </p>
      </div>

      {/* Quota Management Component */}
      <AdminQuotaManagerV2 />
    </div>
  );
}
