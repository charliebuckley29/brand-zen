import React from 'react';
import { useUserRole } from '../../hooks/use-user-role';
import { AdminLayout } from '../../components/ui/admin-layout';
import { WebSocketDebug } from '../../components/admin/WebSocketDebug';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router-dom';

export default function AdminWebSocketDebug() {
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <AdminLayout
        title="WebSocket Debug"
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
        title="WebSocket Debug"
        description="Access denied"
      >
        <div className="text-center py-12">
          <div className="text-muted-foreground">You need admin privileges to access this page.</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="WebSocket Debug"
      description="Real-time WebSocket connection monitoring and debugging"
      actions={
        <Link to="/admin">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Button>
        </Link>
      }
    >
      <WebSocketDebug />
    </AdminLayout>
  );
}
