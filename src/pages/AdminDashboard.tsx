import { useUserRole } from "../hooks/use-user-role";
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "../components/ui/enhanced-card";
import { Button } from "../components/ui/button";
import { ArrowLeft, Key, Users, Settings, Database, Bug, MessageSquare, Activity, BarChart3, GitBranch, TestTube, Mail, AlertTriangle, Zap, Bell, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { PageContainer, PageHeader, Grid } from "../components/ui/layout-system";

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
      <div className="min-h-screen flex items-center justify-center p-4">
        <EnhancedCard variant="elevated" className="w-full max-w-md">
          <EnhancedCardHeader>
            <EnhancedCardTitle className="text-center">Access Denied</EnhancedCardTitle>
            <EnhancedCardDescription className="text-center">
              You need admin privileges to access this page.
            </EnhancedCardDescription>
          </EnhancedCardHeader>
          <EnhancedCardContent className="text-center">
            <Link to="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </EnhancedCardContent>
        </EnhancedCard>
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader
          title="Admin Dashboard"
          description="Manage system settings and user accounts"
          breadcrumbs={
            <Link to="/" className="text-primary hover:underline">
              Dashboard
            </Link>
          }
          actions={
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          }
        />

        <Grid columns={2} gap="lg">
          <Link to="/admin/api">
            <EnhancedCard variant="interactive" hover="lift">
              <EnhancedCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Key className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <EnhancedCardTitle size="lg">User Quota Management</EnhancedCardTitle>
                    <EnhancedCardDescription>
                      Manage monthly quota limits and user exceptions
                    </EnhancedCardDescription>
                  </div>
                </div>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <p className="text-sm text-muted-foreground">
                  Set default monthly limits for each data source and create individual user exceptions as needed.
                </p>
              </EnhancedCardContent>
            </EnhancedCard>
          </Link>

          <Link to="/admin/moderators">
            <EnhancedCard variant="interactive" hover="lift">
              <EnhancedCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <EnhancedCardTitle size="lg">Moderator Management</EnhancedCardTitle>
                    <EnhancedCardDescription>
                      Manage moderator and admin accounts
                    </EnhancedCardDescription>
                  </div>
                </div>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <p className="text-sm text-muted-foreground">
                  View, edit, and manage moderator and admin user accounts, roles, and permissions.
                </p>
              </EnhancedCardContent>
            </EnhancedCard>
          </Link>

          <Link to="/admin/bug-reports">
            <EnhancedCard variant="interactive" hover="lift">
              <EnhancedCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Bug className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <EnhancedCardTitle size="lg">Bug Reports</EnhancedCardTitle>
                    <EnhancedCardDescription>
                      Manage and track user bug reports
                    </EnhancedCardDescription>
                  </div>
                </div>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <p className="text-sm text-muted-foreground">
                  View, assign, and manage bug reports submitted by users with detailed tracking and resolution workflow.
                </p>
              </EnhancedCardContent>
            </EnhancedCard>
          </Link>

          <Link to="/admin/twilio">
            <EnhancedCard variant="interactive" hover="lift">
              <EnhancedCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <EnhancedCardTitle size="lg">Twilio Configuration</EnhancedCardTitle>
                    <EnhancedCardDescription>
                      SMS and WhatsApp notifications
                    </EnhancedCardDescription>
                  </div>
                </div>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <p className="text-sm text-muted-foreground">
                  Configure Twilio settings for sending SMS and WhatsApp alerts for negative sentiment mentions.
                </p>
              </EnhancedCardContent>
            </EnhancedCard>
          </Link>

          <Link to="/admin/unified-monitoring">
            <EnhancedCard variant="interactive" hover="lift">
              <EnhancedCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-success-600" />
                  </div>
                  <div>
                    <EnhancedCardTitle size="lg">Unified Monitoring Dashboard</EnhancedCardTitle>
                    <EnhancedCardDescription>
                      Comprehensive system monitoring & analytics
                    </EnhancedCardDescription>
                  </div>
                </div>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <p className="text-sm text-muted-foreground">
                  Monitor API usage, user quotas, system health, performance metrics, and user activity in one unified dashboard.
                </p>
              </EnhancedCardContent>
            </EnhancedCard>
          </Link>

          <Link to="/admin/queue-errors">
            <EnhancedCard variant="interactive" hover="lift">
              <EnhancedCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-danger-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-danger-600" />
                  </div>
                  <div>
                    <EnhancedCardTitle size="lg">Queue Error Monitoring</EnhancedCardTitle>
                    <EnhancedCardDescription>
                      Monitor queue health, errors, and retry patterns
                    </EnhancedCardDescription>
                  </div>
                </div>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <p className="text-sm text-muted-foreground">
                  Track queue failures, retry analytics, and manage queue recovery for Google Alerts and other API sources.
                </p>
              </EnhancedCardContent>
            </EnhancedCard>
          </Link>

          <Link to="/admin/automated-recovery">
            <EnhancedCard variant="interactive" hover="lift">
              <EnhancedCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-info-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-info-600" />
                  </div>
                  <div>
                    <EnhancedCardTitle size="lg">Automated Recovery System</EnhancedCardTitle>
                    <EnhancedCardDescription>
                      Smart recovery for queue failures and system issues
                    </EnhancedCardDescription>
                  </div>
                </div>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <p className="text-sm text-muted-foreground">
                  Monitor and manage automated recovery actions that detect and fix queue failures, API issues, and system problems automatically.
                </p>
              </EnhancedCardContent>
            </EnhancedCard>
          </Link>

          <Link to="/admin/system-alerts">
            <EnhancedCard variant="interactive" hover="lift">
              <EnhancedCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                    <Bell className="w-6 h-6 text-warning-600" />
                  </div>
                  <div>
                    <EnhancedCardTitle size="lg">System Alerts</EnhancedCardTitle>
                    <EnhancedCardDescription>
                      Real-time alerts and notifications
                    </EnhancedCardDescription>
                  </div>
                </div>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <p className="text-sm text-muted-foreground">
                  View and manage system alerts, notifications, and escalation policies for critical issues and recovery failures.
                </p>
              </EnhancedCardContent>
            </EnhancedCard>
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
            <EnhancedCard variant="interactive" hover="lift">
              <EnhancedCardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                    <TestTube className="w-6 h-6 text-warning-600" />
                  </div>
                  <div>
                    <EnhancedCardTitle size="lg">Test & Debug Tools</EnhancedCardTitle>
                    <EnhancedCardDescription>
                      Comprehensive testing and debugging tools for troubleshooting
                    </EnhancedCardDescription>
                  </div>
                </div>
              </EnhancedCardHeader>
              <EnhancedCardContent>
                <p className="text-sm text-muted-foreground">
                  Run system tests, debug API issues, test cursor continuity, and generate test data for monitoring.
                </p>
              </EnhancedCardContent>
            </EnhancedCard>
          </Link>

          <EnhancedCard variant="default" className="opacity-50 cursor-not-allowed">
            <EnhancedCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <EnhancedCardTitle size="lg" className="text-muted-foreground">System Settings</EnhancedCardTitle>
                  <EnhancedCardDescription>
                    Configure global system settings
                  </EnhancedCardDescription>
                </div>
              </div>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: Global system configuration, maintenance settings, and advanced options.
              </p>
            </EnhancedCardContent>
          </EnhancedCard>

          <EnhancedCard variant="default" className="opacity-50 cursor-not-allowed">
            <EnhancedCardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <Database className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <EnhancedCardTitle size="lg" className="text-muted-foreground">Database Management</EnhancedCardTitle>
                  <EnhancedCardDescription>
                    Database maintenance and analytics
                  </EnhancedCardDescription>
                </div>
              </div>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: Database statistics, cleanup tools, and performance monitoring.
              </p>
            </EnhancedCardContent>
          </EnhancedCard>
        </Grid>
      </div>
    </PageContainer>
  );
}