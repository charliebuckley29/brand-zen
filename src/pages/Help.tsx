import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  HelpCircle, 
  User, 
  Building2, 
  BarChart3, 
  Flag, 
  Settings, 
  Shield, 
  Mail, 
  Bug,
  Search,
  Bell,
  Globe,
  Users,
  FileText,
  Eye,
  Filter,
  ArrowLeft
} from "lucide-react";

const Help = () => {
  const handleSupportEmail = (type: 'help' | 'bug') => {
    const email = type === 'help' ? 'help@reputations.io' : 'bugs@reputation.io';
    const subject = type === 'help' ? 'Support Request' : 'Bug Report';
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <HelpCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Help & Documentation</h1>
                <p className="text-muted-foreground">
                  Complete guide to using your brand monitoring platform
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="getting-started" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="admin">Administration</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>

          {/* Getting Started */}
          <TabsContent value="getting-started" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Getting Started
                </CardTitle>
                <CardDescription>
                  Welcome to your brand monitoring platform. Follow these steps to get started.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">1. Complete Your Profile</h3>
                    <p className="text-muted-foreground">
                      After signing up, you'll be prompted to complete your profile with your full name and phone number. 
                      This information helps our support team assist you effectively.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">2. Set Up Brand Monitoring</h3>
                    <p className="text-muted-foreground">
                      Configure your brand name and variants (alternative names or spellings) that you want to monitor across the web. 
                      This forms the foundation of your monitoring setup.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">3. Configure Google Alerts (Optional)</h3>
                    <p className="text-muted-foreground">
                      Link your Google Alerts RSS feed to automatically import mentions from Google's monitoring system. 
                      This expands your monitoring coverage significantly.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">4. Review Your Dashboard</h3>
                    <p className="text-muted-foreground">
                      Once set up, your dashboard will display incoming mentions, sentiment analysis, and key metrics 
                      about your brand's online presence.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features */}
          <TabsContent value="features" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Dashboard & Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Real-time mention tracking</li>
                    <li>• Sentiment analysis (positive, negative, neutral)</li>
                    <li>• Source breakdown (news, social media, blogs)</li>
                    <li>• Trending mentions and alerts</li>
                    <li>• Historical data visualization</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5" />
                    Mention Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• View detailed mention information</li>
                    <li>• Flag important mentions for review</li>
                    <li>• Add internal notes and escalation types</li>
                    <li>• Filter by sentiment, source, and date</li>
                    <li>• Export mentions for reporting</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Monthly automated reports</li>
                    <li>• Sentiment breakdown analysis</li>
                    <li>• Top sources identification</li>
                    <li>• Trend analysis over time</li>
                    <li>• PDF export functionality</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Source Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Control which sources appear in mentions</li>
                    <li>• Toggle sources for reports and analytics</li>
                    <li>• Customize data visibility by source type</li>
                    <li>• Manage news, social media, and blog sources</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Monitoring */}
          <TabsContent value="monitoring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  How Monitoring Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Brand Keywords</h3>
                    <p className="text-muted-foreground text-sm">
                      Our system monitors the web for mentions of your brand name and its variants. 
                      Set up multiple variants to catch different spellings, abbreviations, or common misspellings.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Source Coverage</h3>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">News Sites</Badge>
                        <span className="text-muted-foreground">Major news publications and industry outlets</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Social Media</Badge>
                        <span className="text-muted-foreground">Twitter, Facebook, LinkedIn, and other platforms</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Blogs</Badge>
                        <span className="text-muted-foreground">Industry blogs and personal websites</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Forums</Badge>
                        <span className="text-muted-foreground">Reddit, specialized forums, and communities</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Google Alerts Integration</h3>
                    <p className="text-muted-foreground text-sm">
                      Connect your Google Alerts RSS feed to automatically import mentions that Google discovers. 
                      This significantly expands your monitoring coverage and ensures you don't miss important mentions.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Mention Exclusions</h3>
                    <p className="text-muted-foreground text-sm">
                      Mark mentions as "not relevant" to improve the quality of your monitoring. 
                      Our system learns from these exclusions to provide better results over time.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Alerts & Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Flagged Mentions</h3>
                    <p className="text-muted-foreground text-sm">
                      Important mentions are automatically flagged based on sentiment analysis and source credibility. 
                      You can also manually flag mentions for follow-up.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Escalation Types</h3>
                    <p className="text-muted-foreground text-sm">
                      Categorize flagged mentions by escalation type (legal, PR, customer service) 
                      to ensure the right team handles each situation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Administration */}
          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Roles & Permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge>Basic User</Badge>
                      <span className="text-sm font-medium">Standard Access</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Access to dashboard, mentions, reports, and personal settings. 
                      Can manage their own brand monitoring setup.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">PR User</Badge>
                      <span className="text-sm font-medium">Enhanced Access</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      All basic user features plus advanced reporting and analytics capabilities.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">Legal User</Badge>
                      <span className="text-sm font-medium">Legal Focus</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Specialized access for legal team members with focus on flagged mentions and escalations.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default">Moderator</Badge>
                      <span className="text-sm font-medium">Full Access</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Complete administrative access including user management, global settings, 
                      and the ability to edit any user's profile or brand settings.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Account Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Profile Management</h3>
                    <p className="text-muted-foreground text-sm">
                      Update your personal information, change passwords, and manage account preferences. 
                      Keep your contact information current for important notifications.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Brand Settings</h3>
                    <p className="text-muted-foreground text-sm">
                      Modify your brand name, add or remove variants, and update Google Alerts integration. 
                      Note: Some organizations may restrict brand name changes - contact support if needed.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Source Preferences</h3>
                    <p className="text-muted-foreground text-sm">
                      Control which types of sources appear in your mentions, reports, and analytics. 
                      Customize your monitoring experience based on your needs.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support */}
          <TabsContent value="support" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Get Help
                  </CardTitle>
                  <CardDescription>
                    Need assistance? Our support team is here to help.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={() => handleSupportEmail('help')} 
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Contact Support Team
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Email: <code className="bg-muted px-2 py-1 rounded">help@reputations.io</code>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    For general questions, account issues, feature requests, and training support.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bug className="h-5 w-5" />
                    Report Issues
                  </CardTitle>
                  <CardDescription>
                    Found a bug or technical issue? Let us know.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={() => handleSupportEmail('bug')} 
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Bug className="mr-2 h-4 w-4" />
                    Report Bug
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Email: <code className="bg-muted px-2 py-1 rounded">bugs@reputation.io</code>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    For technical issues, bugs, system errors, and platform problems.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">How often are mentions updated?</h3>
                  <p className="text-sm text-muted-foreground">
                    Mentions are collected and updated continuously throughout the day. 
                    New mentions typically appear within 15-30 minutes of being published online.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Can I change my brand name after setup?</h3>
                  <p className="text-sm text-muted-foreground">
                    Yes, you can modify your brand name and variants in your settings. 
                    However, some organizations may have this feature restricted by administrators. 
                    Contact support if you need assistance with brand name changes.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">What does the sentiment analysis mean?</h3>
                  <p className="text-sm text-muted-foreground">
                    Our AI analyzes the context and tone of each mention to classify it as positive, 
                    negative, or neutral. This helps you quickly identify mentions that may require attention 
                    or celebration.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">How do I set up Google Alerts integration?</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a Google Alert for your brand, then copy the RSS feed URL from the alert settings. 
                    Paste this URL into your brand settings to automatically import Google's findings.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Can I export my data?</h3>
                  <p className="text-sm text-muted-foreground">
                    Yes, you can export mentions, reports, and analytics data. 
                    Look for export options in the respective sections of the application.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Help;