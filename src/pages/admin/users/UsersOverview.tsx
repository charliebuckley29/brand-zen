import { useUserRole } from "../../../hooks/use-user-role";
import { AdminLayout } from "../../../components/ui/admin-layout";
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "../../../components/ui/enhanced-card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  ArrowLeft,
  Activity,
  Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { createApiUrl } from "../../../lib/api";

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  pendingApproval: number;
  recentSignups: number;
  monthlyGrowth: number;
  engagementRate: number;
}

export default function UsersOverview() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserStats = async () => {
    try {
      const response = await fetch(createApiUrl('/admin/users'));
      const data = await response.json();
      
      if (data.success) {
        const users = data.data || [];
        const totalUsers = users.length;
        const activeUsers = users.filter((user: any) => user.user_status === 'active').length;
        const pendingApproval = users.filter((user: any) => user.user_status === 'pending_approval').length;
        
        // Calculate recent signups (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentSignups = users.filter((user: any) => 
          new Date(user.created_at) > weekAgo
        ).length;

        setUserStats({
          totalUsers,
          activeUsers,
          pendingApproval,
          recentSignups,
          monthlyGrowth: 0, // TODO: Calculate from historical data
          engagementRate: 0 // TODO: Calculate from activity data
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  if (roleLoading || loading) {
    return (
      <AdminLayout
        title="User Overview"
        description="Loading user statistics..."
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
        title="User Overview"
        description="Access denied"
      >
        <div className="text-center py-12">
          <EnhancedCard variant="elevated" className="w-full max-w-md mx-auto">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="text-center">Access Denied</EnhancedCardTitle>
              <EnhancedCardDescription className="text-center">
                You need admin privileges to access this page.
              </EnhancedCardDescription>
            </EnhancedCardHeader>
          </EnhancedCard>
        </div>
      </AdminLayout>
    );
  }

  const stats = [
    {
      title: 'Total Users',
      value: userStats?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Users',
      value: userStats?.activeUsers || 0,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Pending Approval',
      value: userStats?.pendingApproval || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Recent Signups (7d)',
      value: userStats?.recentSignups || 0,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  return (
    <AdminLayout
      title="User Overview"
      description="User statistics, analytics, and management overview"
      actions={
        <div className="flex gap-2">
          <Button onClick={fetchUserStats} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
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
      {/* User Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <EnhancedCard key={index} variant="outlined">
            <EnhancedCardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link to="/admin/users/quotas">
          <EnhancedCard variant="interactive" hover="lift">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                Quota Management
              </EnhancedCardTitle>
              <EnhancedCardDescription>
                Manage monthly quota limits and user exceptions
              </EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <p className="text-sm text-muted-foreground">
                Set default monthly limits for each data source and create individual user exceptions.
              </p>
            </EnhancedCardContent>
          </EnhancedCard>
        </Link>

        <Link to="/admin/users/moderators">
          <EnhancedCard variant="interactive" hover="lift">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-green-600" />
                </div>
                Moderator Management
              </EnhancedCardTitle>
              <EnhancedCardDescription>
                Manage moderator and admin accounts
              </EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <p className="text-sm text-muted-foreground">
                View, edit, and manage moderator and admin user accounts, roles, and permissions.
              </p>
            </EnhancedCardContent>
          </EnhancedCard>
        </Link>

        <Link to="/admin/users/approvals">
          <EnhancedCard variant="interactive" hover="lift">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
                User Approvals
              </EnhancedCardTitle>
              <EnhancedCardDescription>
                Review and approve pending user applications
              </EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {userStats?.pendingApproval || 0} users awaiting approval
                </p>
                {userStats?.pendingApproval && userStats.pendingApproval > 0 && (
                  <Badge variant="destructive">
                    {userStats.pendingApproval} Pending
                  </Badge>
                )}
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </Link>
      </div>

      {/* Recent Activity */}
      <EnhancedCard>
        <EnhancedCardHeader>
          <EnhancedCardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent User Activity
          </EnhancedCardTitle>
          <EnhancedCardDescription>
            Latest user registrations and activity
          </EnhancedCardDescription>
        </EnhancedCardHeader>
        <EnhancedCardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Recent activity data will be displayed here</p>
            <p className="text-sm">Backend endpoint needed: /admin/users/activity</p>
          </div>
        </EnhancedCardContent>
      </EnhancedCard>
    </AdminLayout>
  );
}
