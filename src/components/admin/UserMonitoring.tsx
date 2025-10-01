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
import { toast } from 'sonner';

interface UserMonitoringProps {
  onRefresh: () => void;
  loading: boolean;
}

export function UserMonitoring({ onRefresh, loading }: UserMonitoringProps) {
  const [userStats, setUserStats] = useState<any>(null);
  const [monthlyMentions, setMonthlyMentions] = useState<any>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

  const fetchUserData = async () => {
    try {
      // Fetch real user statistics from multiple endpoints
      const [usersResponse, mentionsResponse] = await Promise.all([
        fetch('https://mentions-backend.vercel.app/api/api/admin/users'),
        fetch(`https://mentions-backend.vercel.app/api/api/admin/monthly-mentions?month=${new Date().toISOString().slice(0, 7)}`)
      ]);

      let usersData = null;
      let mentionsData = null;

      if (usersResponse.ok) {
        usersData = await usersResponse.json();
        console.log('Users data:', usersData); // Debug log
      } else {
        console.warn('Users endpoint not available');
      }

      if (mentionsResponse.ok) {
        mentionsData = await mentionsResponse.json();
        console.log('Monthly mentions data:', mentionsData); // Debug log
        setMonthlyMentions(mentionsData.data || mentionsData);
      } else {
        console.warn('Monthly mentions endpoint not available');
        setMonthlyMentions(null);
      }

      // Calculate combined user statistics
      const users = usersData?.data || [];
      const totalUsers = users.length;
      const activeUsers = users.length; // All users in the system are considered active for now
      
      // Calculate engagement metrics from mentions data
      const mentions = mentionsData?.data || null;
      const totalMentions = mentions?.total_mentions || 0;
      const uniqueUsers = mentions?.unique_users || 0;
      const avgMentionsPerUser = uniqueUsers > 0 ? (totalMentions / uniqueUsers) : 0;
      
      // Calculate total keywords (would need separate endpoint)
      const totalKeywords = 0; // TODO: Add keywords endpoint
      const avgKeywordsPerUser = totalUsers > 0 ? (totalKeywords / totalUsers) : 0;

      // Create top users from mentions data if available
      let topUsers = users.slice(0, 10).map((user: any) => ({
        id: user.user_id,
        created_at: new Date().toISOString(),
        mention_count: 0,
        keyword_count: 0,
        last_active: true
      }));

      if (mentions?.mentions_by_user) {
        topUsers = mentions.mentions_by_user.slice(0, 10).map((user: any) => ({
          id: user.user_id,
          created_at: new Date().toISOString(),
          mention_count: user.total_mentions,
          keyword_count: 0, // Would need separate calculation
          last_active: true
        }));
      }

      setUserStats({
        totalUsers,
        activeUsers,
        totalMentions,
        totalKeywords,
        userGrowth: 0, // Would need historical data
        activeGrowth: 0, // Would need historical data
        mentionGrowth: 0, // Would need historical data
        keywordGrowth: 0, // Would need historical data
        engagement: {
          avgMentionsPerUser,
          avgKeywordsPerUser,
          retentionRate: 95.0 // Default value
        },
        topUsers
      });

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

          {userStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(userStats.totalUsers)}
                </div>
                <div className="text-sm text-muted-foreground">Total Users</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {getGrowthIcon(userStats.userGrowth)}
                  <span className={`text-xs ${getGrowthColor(userStats.userGrowth)}`}>
                    {userStats.userGrowth > 0 ? '+' : ''}{userStats.userGrowth}%
                  </span>
                </div>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatNumber(userStats.activeUsers)}
                </div>
                <div className="text-sm text-muted-foreground">Active Users</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {getGrowthIcon(userStats.activeGrowth)}
                  <span className={`text-xs ${getGrowthColor(userStats.activeGrowth)}`}>
                    {userStats.activeGrowth > 0 ? '+' : ''}{userStats.activeGrowth}%
                  </span>
                </div>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {formatNumber(userStats.totalMentions)}
                </div>
                <div className="text-sm text-muted-foreground">Total Mentions</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {getGrowthIcon(userStats.mentionGrowth)}
                  <span className={`text-xs ${getGrowthColor(userStats.mentionGrowth)}`}>
                    {userStats.mentionGrowth > 0 ? '+' : ''}{userStats.mentionGrowth}%
                  </span>
                </div>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {formatNumber(userStats.totalKeywords)}
                </div>
                <div className="text-sm text-muted-foreground">Total Keywords</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {getGrowthIcon(userStats.keywordGrowth)}
                  <span className={`text-xs ${getGrowthColor(userStats.keywordGrowth)}`}>
                    {userStats.keywordGrowth > 0 ? '+' : ''}{userStats.keywordGrowth}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-500" />
              <p>User statistics not available</p>
              <p className="text-sm mt-2">Check console for debug information</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Mentions Breakdown */}
      {monthlyMentions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Mentions Breakdown
            </CardTitle>
            <CardDescription>
              Mentions by source and user for {monthlyMentions.month}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Mentions by Source */}
              <div>
                <h4 className="text-sm font-medium mb-3">Mentions by Source</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {monthlyMentions.mentions_by_source.map((source: any) => (
                    <div key={source.source_type} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">{source.source_type}</span>
                        <Badge variant="outline">{source.total_mentions}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {source.unique_users} users • {source.avg_mentions_per_user.toFixed(1)} avg/user
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Users */}
              {monthlyMentions.mentions_by_user && monthlyMentions.mentions_by_user.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Top Users by Mentions</h4>
                  <div className="space-y-2">
                    {monthlyMentions.mentions_by_user.slice(0, 10).map((user: any) => (
                      <div key={user.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            User ID: {user.user_id.slice(0, 8)}...
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{user.total_mentions} mentions</div>
                          <div className="text-sm text-muted-foreground">
                            {Object.keys(user.mentions_by_source).length} sources
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Engagement Metrics */}
      {userStats && (
        <Card>
          <CardHeader>
            <CardTitle>User Engagement Metrics</CardTitle>
            <CardDescription>
              Key engagement indicators and user behavior patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {userStats.engagement.avgMentionsPerUser.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Mentions/User</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {userStats.engagement.avgKeywordsPerUser.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Keywords/User</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {userStats.engagement.retentionRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Retention Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

