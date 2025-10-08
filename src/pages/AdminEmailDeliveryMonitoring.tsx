import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/use-user-role';
import { EmailDeliveryMonitoring } from '@/components/admin/EmailDeliveryMonitoring';
import { AdminLayout } from '@/components/ui/admin-layout';

export default function AdminEmailDeliveryMonitoring() {
  const { isAdmin, loading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <AdminLayout
        title="Email Delivery Monitoring"
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
    return null;
  }

  return (
    <AdminLayout
      title="Email Delivery Monitoring"
      description="Monitor email delivery status and track SendGrid webhooks"
    >
      <EmailDeliveryMonitoring />
    </AdminLayout>
  );
}
