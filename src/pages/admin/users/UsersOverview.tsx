import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminPageHeader } from '@/components/admin/shared/AdminPageHeader';
import { AdminDataTable } from '@/components/admin/shared/AdminDataTable';
import { AdminStatsCard } from '@/components/admin/shared/AdminStatsCard';
import { AdminStatusBadge } from '@/components/admin/shared/AdminStatusBadge';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Settings, 
  Shield,
  TrendingUp,
  Clock
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  user_status: 'approved' | 'pending' | 'rejected';
  created_at: string;
  last_active: string;
  quota_used: number;
  quota_limit: number;
  role: 'admin' | 'moderator' | 'basic_user';
}

interface UserStats {
  total: number;
  active: number;
  pending: number;
  rejected: number;
  quotaUtilization: number;
}

const UsersOverview: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    pending: 0,
    rejected: 0,
    quotaUtilization: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchUsersData();
  }, []);

  const fetchUsersData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch users data
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      
      setUsers(data.users || []);
      
      // Calculate stats
      const total = data.users?.length || 0;
      const active = data.users?.filter((u: User) => u.user_status === 'approved').length || 0;
      const pending = data.users?.filter((u: User) => u.user_status === 'pending').length || 0;
      const rejected = data.users?.filter((u: User) => u.user_status === 'rejected').length || 0;
      const quotaUtilization = data.users?.reduce((sum: number, u: User) => sum + (u.quota_used / u.quota_limit), 0) / total * 100 || 0;
      
      setStats({
        total,
        active,
        pending,
        rejected,
        quotaUtilization: Math.round(quotaUtilization)
      });
    } catch (error) {
      console.error('Error fetching users data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      fetchUsersData();
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      await fetch(`/api/admin/users/${userId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      fetchUsersData();
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };

  const userColumns = [
    {
      key: 'email',
      label: 'Email',
      render: (value: string, row: User) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">{row.full_name}</div>
        </div>
      )
    },
    {
      key: 'user_status',
      label: 'Status',
      render: (value: string) => (
        <AdminStatusBadge 
          status={value === 'approved' ? 'healthy' : value === 'pending' ? 'warning' : 'error'}
          text={value}
        />
      )
    },
    {
      key: 'role',
      label: 'Role',
      render: (value: string) => (
        <Badge variant="outline">
          {value.replace('_', ' ')}
        </Badge>
      )
    },
    {
      key: 'quota_used',
      label: 'Quota Usage',
      render: (value: number, row: User) => (
        <div className="text-sm">
          <div>{value} / {row.quota_limit}</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${(value / row.quota_limit) * 100}%` }}
            />
          </div>
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: User) => (
        <div className="flex space-x-2">
          {row.user_status === 'pending' && (
            <>
              <Button 
                size="sm" 
                onClick={() => handleApproveUser(row.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                Approve
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleRejectUser(row.id)}
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                Reject
              </Button>
            </>
          )}
          <Button size="sm" variant="outline">
            Edit
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="User Management"
        subtitle="Manage users, roles, and quotas"
        onRefresh={fetchUsersData}
        isLoading={isLoading}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users' }
        ]}
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatsCard
          title="Total Users"
          value={stats.total}
          icon={<Users className="w-5 h-5" />}
          status="info"
        />
        
        <AdminStatsCard
          title="Active Users"
          value={stats.active}
          subtitle={`${stats.pending} pending approval`}
          icon={<UserCheck className="w-5 h-5" />}
          status="healthy"
        />
        
        <AdminStatsCard
          title="Pending Approval"
          value={stats.pending}
          icon={<Clock className="w-5 h-5" />}
          status={stats.pending > 0 ? 'warning' : 'healthy'}
        />
        
        <AdminStatsCard
          title="Quota Utilization"
          value={`${stats.quotaUtilization}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          status={stats.quotaUtilization > 80 ? 'warning' : 'healthy'}
        />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quota">Quota Management</TabsTrigger>
          <TabsTrigger value="moderators">Moderators</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AdminDataTable
            title="All Users"
            data={users}
            columns={userColumns}
            isLoading={isLoading}
            onRefresh={fetchUsersData}
            emptyMessage="No users found"
          />
        </TabsContent>

        <TabsContent value="quota" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quota Management</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminDataTable
                data={users.filter(u => u.quota_used > 0)}
                columns={[
                  { key: 'email', label: 'User' },
                  { key: 'quota_used', label: 'Used' },
                  { key: 'quota_limit', label: 'Limit' },
                  {
                    key: 'utilization',
                    label: 'Utilization',
                    render: (value: any, row: User) => (
                      <div className="text-sm">
                        <div>{Math.round((row.quota_used / row.quota_limit) * 100)}%</div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(row.quota_used / row.quota_limit) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  }
                ]}
                isLoading={isLoading}
                onRefresh={fetchUsersData}
                emptyMessage="No quota data available"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderators" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Moderator Management</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminDataTable
                data={users.filter(u => u.role === 'moderator' || u.role === 'admin')}
                columns={[
                  { key: 'email', label: 'Email' },
                  { key: 'full_name', label: 'Name' },
                  { key: 'role', label: 'Role' },
                  { key: 'user_status', label: 'Status' },
                  { key: 'last_active', label: 'Last Active' }
                ]}
                isLoading={isLoading}
                onRefresh={fetchUsersData}
                emptyMessage="No moderators found"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminDataTable
                data={users.filter(u => u.user_status === 'pending')}
                columns={userColumns.filter(col => col.key !== 'actions').concat([{
                  key: 'actions',
                  label: 'Actions',
                  render: (value: any, row: User) => (
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleApproveUser(row.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleRejectUser(row.id)}
                        className="border-red-600 text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </Button>
                    </div>
                  )
                }])}
                isLoading={isLoading}
                onRefresh={fetchUsersData}
                emptyMessage="No pending approvals"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UsersOverview;