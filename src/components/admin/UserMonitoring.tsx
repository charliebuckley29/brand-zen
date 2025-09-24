import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Users,
  TrendingUp, 
  TrendingDown,
  RefreshCw, 
  BarChart3, 
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Calendar,
  Filter
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  AreaChart,
  Area
} from 'recharts';
import { toast } from 'sonner';

interface UserMonitoringProps {
  onRefresh: () => void;
  loading: boolean;
}

export function UserMonitoring({ onRefresh, loading }: UserMonitoringProps) {
  const [userStats, setUserStats] = useState<any>(null);
  const [userActivity, setUserActivity] = useState<any>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

  const fetchUserData = async () => {
    try {
      // Fetch user statistics from users endpoint
      const statsResponse = await fetch('https://mentions-backend.vercel.app/api/admin/users');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('Users data:', statsData); // Debug log
        
        // Transform the data to match expected structure
        const users = statsData.data || [];
        const transformedStats = {
          totalUsers: users.length,
          activeUsers: users.length, // Assume all users are active for now
          totalMentions: 0, // Will need to fetch from mentions table
          totalKeywords: 0, // Will need to fetch from keywords table
          userGrowth: 0,
          activeGrowth: 0,
          mentionGrowth: 0,
          keywordGrowth: 0,
          engagement: {
            avgMentionsPerUser: 0,
            avgKeywordsPerUser: 0,
            retentionRate: 95.0
          },
          topUsers: users.slice(0, 10).map((user: any) => ({
            id: user.user_id,
            created_at: new Date().toISOString(),
            mention_count: 0,
            keyword_count: 0,
            last_active: true
          }))
        };
        setUserStats(transformedStats);
      } else {
        console.warn('Users endpoint not available');
        setUserStats(null);
      }

      // Fetch monthly mentions data as activity data
      const activityResponse = await fetch(`https://mentions-backend.vercel.app/api/admin/monthly-mentions?timeRange=${selectedTimeRange}`);
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        console.log('Monthly mentions data:', activityData); // Debug log
        setUserActivity(activityData.data || activityData);
      } else {
        console.warn('Monthly mentions endpoint not available');
        setUserActivity(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Don't show toast for missing endpoints, just log the error
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [selectedTimeRange]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (growth < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4" />;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* User Statistics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Statistics Overview
          </CardTitle>
          <CardDescription>
            User registration, activity, and engagement metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                onClick={onRefresh} 
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select 
                  value={selectedTimeRange} 
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="1h">Last Hour</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>

          {userStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(userStats.totalUsers || 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Users</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {getGrowthIcon(userStats.userGrowth || 0)}
                  <span className={`text-xs ${getGrowthColor(userStats.userGrowth || 0)}`}>
                    {userStats.userGrowth > 0 ? '+' : ''}{userStats.userGrowth || 0}%
                  </span>
                </div>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatNumber(userStats.activeUsers || 0)}
                </div>
                <div className="text-sm text-muted-foreground">Active Users</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {getGrowthIcon(userStats.activeGrowth || 0)}
                  <span className={`text-xs ${getGrowthColor(userStats.activeGrowth || 0)}`}>
                    {userStats.activeGrowth > 0 ? '+' : ''}{userStats.activeGrowth || 0}%
                  </span>
                </div>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {formatNumber(userStats.totalMentions || 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Mentions</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {getGrowthIcon(userStats.mentionGrowth || 0)}
                  <span className={`text-xs ${getGrowthColor(userStats.mentionGrowth || 0)}`}>
                    {userStats.mentionGrowth > 0 ? '+' : ''}{userStats.mentionGrowth || 0}%
                  </span>
                </div>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {formatNumber(userStats.totalKeywords || 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Keywords</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {getGrowthIcon(userStats.keywordGrowth || 0)}
                  <span className={`text-xs ${getGrowthColor(userStats.keywordGrowth || 0)}`}>
                    {userStats.keywordGrowth > 0 ? '+' : ''}{userStats.keywordGrowth || 0}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Activity Trends */}
      {userActivity && userActivity.trends && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              User Activity Trends
            </CardTitle>
            <CardDescription>
              User registration and activity patterns over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userActivity.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    tickFormatter={(value) => {
                      if (selectedTimeRange === '1h') return `${value}:00`;
                      if (selectedTimeRange === '24h') return `${value}:00`;
                      return value;
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => `Time: ${value}`}
                    formatter={(value, name) => [value, name]}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="newUsers" 
                    stackId="1"
                    stroke="#8884d8" 
                    fill="#8884d8"
                    name="New Users"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="activeUsers" 
                    stackId="1"
                    stroke="#82ca9d" 
                    fill="#82ca9d"
                    name="Active Users"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="mentions" 
                    stackId="1"
                    stroke="#ffc658" 
                    fill="#ffc658"
                    name="Mentions"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Engagement Metrics */}
      {userStats && userStats.engagement && (
        <Card>
          <CardHeader>
            <CardTitle>User Engagement Metrics</CardTitle>
            <CardDescription>
              Key engagement indicators and user behavior patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {userStats.engagement.avgMentionsPerUser?.toFixed(1) || '0'}
                </div>
                <div className="text-sm text-muted-foreground">Avg Mentions/User</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {userStats.engagement.avgKeywordsPerUser?.toFixed(1) || '0'}
                </div>
                <div className="text-sm text-muted-foreground">Avg Keywords/User</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {userStats.engagement.retentionRate?.toFixed(1) || '0'}%
                </div>
                <div className="text-sm text-muted-foreground">Retention Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Users */}
      {userStats && userStats.topUsers && userStats.topUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Active Users</CardTitle>
            <CardDescription>
              Users with the highest activity and mention counts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userStats.topUsers.slice(0, 10).map((user: any, index: number) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        User {user.id.slice(0, 8)}...
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-sm font-medium">{user.mention_count || 0}</div>
                      <div className="text-xs text-muted-foreground">Mentions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{user.keyword_count || 0}</div>
                      <div className="text-xs text-muted-foreground">Keywords</div>
                    </div>
                    <Badge variant="default">
                      {user.last_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
