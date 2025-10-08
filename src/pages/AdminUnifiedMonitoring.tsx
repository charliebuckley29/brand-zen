import React, { useState } from 'react';
import { useUserRole } from '../hooks/use-user-role';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AdminLayout } from '../components/ui/admin-layout';

// Import the new smaller components
import { SystemOverview } from '../components/admin/SystemOverview';
import { ApiMonitoring } from '../components/admin/ApiMonitoring';
import { UserMonitoring } from '../components/admin/UserMonitoring';
import { AlertMonitoring } from '../components/admin/AlertMonitoring';
import { SentimentWorkerMonitoring } from '../components/SentimentWorkerMonitoring';
import LogArchives from '../components/LogArchives';
import ArchiveRetention from '../components/ArchiveRetention';

export default function AdminUnifiedMonitoring() {
  const { userType, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(false);

  // Show loading state while checking user role
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is admin
  if (userType !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Trigger refresh for all components
      toast.success('Refreshing all monitoring data...');
      // The individual components will handle their own refresh logic
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh monitoring data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout
      title="Unified Monitoring Dashboard"
      description="Comprehensive system monitoring and administration"
    >

        {/* Main Content */}
        <Tabs defaultValue="system" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="api">APIs</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
            <TabsTrigger value="archives">Log Archives</TabsTrigger>
            <TabsTrigger value="retention">Retention</TabsTrigger>
        </TabsList>

          <TabsContent value="system" className="space-y-6">
            <SystemOverview onRefresh={handleRefresh} loading={loading} />
        </TabsContent>

          <TabsContent value="api" className="space-y-6">
            <ApiMonitoring onRefresh={handleRefresh} loading={loading} />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
            <UserMonitoring onRefresh={handleRefresh} loading={loading} />
        </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <AlertMonitoring onRefresh={handleRefresh} loading={loading} />
        </TabsContent>

          <TabsContent value="sentiment" className="space-y-6">
            <SentimentWorkerMonitoring />
        </TabsContent>

          <TabsContent value="archives" className="space-y-6">
            <LogArchives />
        </TabsContent>

          <TabsContent value="retention" className="space-y-6">
            <ArchiveRetention />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

