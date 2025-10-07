import { useUserRole } from "../hooks/use-user-role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ArrowLeft, Key, Users, Settings, Database, Bug, MessageSquare, Activity, BarChart3, GitBranch, TestTube, Mail, AlertTriangle, Zap, Bell, Brain } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">
              You need admin privileges to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage system settings and user accounts
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link to="/admin/api">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Key className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">User Quota Management</CardTitle>
                    <CardDescription>
                      Manage monthly quota limits and user exceptions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Set default monthly limits for each data source and create individual user exceptions as needed.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/moderators">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Moderator Management</CardTitle>
                    <CardDescription>
                      Manage moderator and admin accounts
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View, edit, and manage moderator and admin user accounts, roles, and permissions.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/bug-reports">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Bug className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Bug Reports</CardTitle>
                    <CardDescription>
                      Manage and track user bug reports
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View, assign, and manage bug reports submitted by users with detailed tracking and resolution workflow.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/twilio">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Twilio Configuration</CardTitle>
                    <CardDescription>
                      SMS and WhatsApp notifications
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Configure Twilio settings for sending SMS and WhatsApp alerts for negative sentiment mentions.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/unified-monitoring">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Unified Monitoring Dashboard</CardTitle>
                    <CardDescription>
                      Comprehensive system monitoring & analytics
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Monitor API usage, user quotas, system health, performance metrics, and user activity in one unified dashboard.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/queue-errors">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Queue Error Monitoring</CardTitle>
                    <CardDescription>
                      Monitor queue health, errors, and retry patterns
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track queue failures, retry analytics, and manage queue recovery for Google Alerts and other API sources.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/automated-recovery">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Automated Recovery System</CardTitle>
                    <CardDescription>
                      Smart recovery for queue failures and system issues
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Monitor and manage automated recovery actions that detect and fix queue failures, API issues, and system problems automatically.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/system-alerts">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">System Alerts</CardTitle>
                    <CardDescription>
                      Real-time alerts and notifications
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View and manage system alerts, notifications, and escalation policies for critical issues and recovery failures.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/enhanced-analytics">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Enhanced Analytics</CardTitle>
                    <CardDescription>
                      Predictive insights and performance benchmarking
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  AI-powered predictive insights, trend analysis, performance benchmarking, and system health scoring for proactive optimization.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/email-delivery">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Email Delivery Monitoring</CardTitle>
                    <CardDescription>
                      Track email delivery rates, monitor failed deliveries, and analyze template performance
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Monitor email delivery statistics, retry failed emails, and analyze template performance across all email types including sentiment notifications, password resets, and account signups.
                </p>
                <div className="mt-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/test-debug">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <TestTube className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Test & Debug Tools</CardTitle>
                    <CardDescription>
                      Comprehensive testing and debugging tools for troubleshooting
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Run system tests, debug API issues, test cursor continuity, and generate test data for monitoring.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card className="opacity-50 cursor-not-allowed">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg text-muted-foreground">System Settings</CardTitle>
                  <CardDescription>
                    Configure global system settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: Global system configuration, maintenance settings, and advanced options.
              </p>
            </CardContent>
          </Card>

          <Card className="opacity-50 cursor-not-allowed">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg text-muted-foreground">Database Management</CardTitle>
                  <CardDescription>
                    Database maintenance and analytics
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: Database statistics, cleanup tools, and performance monitoring.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}