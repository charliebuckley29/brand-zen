import { useUserRole } from "@/hooks/use-user-role";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminQuotaManagerV2 } from "@/components/AdminQuotaManagerV2";
import { AdminLayout } from "@/components/ui/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminUserQuotaManagement() {
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <AdminLayout
        title="User Quota Management"
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
        title="User Quota Management"
        description="Access denied"
      >
        <div className="text-center py-12">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Access Denied</CardTitle>
              <CardDescription className="text-center">
                You don't have permission to access this page.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="User Quota Management"
      description="Manage monthly quota limits and user exceptions for data sources"
    >
      {/* Quota Management Component */}
      <AdminQuotaManagerV2 />
    </AdminLayout>
  );
}





