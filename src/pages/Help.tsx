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
  ArrowLeft,
  Newspaper,
  Video
} from "lucide-react";
import { SOURCE_CATEGORIES, SOURCES, getSourcesByCategory, getImplementedSources } from "@/config/sources";

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
                    <h3 className="text-lg font-semibold">3. Configure Source Preferences</h3>
                    <p className="text-muted-foreground">
                      Choose which types of sources you want to monitor and how they appear in your mentions, analytics, and reports. 
                      You can always adjust these settings later.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">4. Set Up Google Alerts (Optional)</h3>
                    <p className="text-muted-foreground">
                      Connect your Google Alerts RSS feed to significantly expand your monitoring coverage. 
                      This integration brings in mentions that Google discovers across the web.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Account Setup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">User Roles</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• <strong>Basic User:</strong> Monitor brands, view mentions, and generate reports</li>
                      <li>• <strong>PR User:</strong> All basic features plus advanced PR management tools</li>
                      <li>• <strong>Legal User:</strong> All features plus legal escalation management</li>
                      <li>• <strong>Moderator:</strong> Full system access and user management</li>
                    </ul>
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
                    <Eye className="h-5 w-5" />
                    Mentions Overview
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
                    <li>• Manage {getImplementedSources().map(s => s.name.toLowerCase()).join(', ')} sources</li>
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
                    <div className="grid gap-3 text-sm">
                      {Object.values(SOURCE_CATEGORIES).map(category => {
                        const sources = getSourcesByCategory(category.id);
                        const implementedSources = sources.filter(s => s.implemented);
                        
                        if (implementedSources.length === 0) return null;
                        
                        const IconComponent = category.icon === "newspaper" ? Newspaper : 
                                            category.icon === "users" ? Users :
                                            category.icon === "video" ? Video : Globe;
                        
                        return (
                          <div key={category.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="flex items-center gap-1">
                                <IconComponent className="h-3 w-3" />
                                {category.name}
                              </Badge>
                              <span className="text-muted-foreground">{category.description}</span>
                            </div>
                            <div className="ml-6 space-y-1">
                              {implementedSources.map(source => (
                                <div key={source.id} className="flex items-center gap-2 text-xs">
                                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                                  <span className="font-medium">{source.name}</span>
                                  <span className="text-muted-foreground">- {source.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
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
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Source Implementation Details
                </CardTitle>
                <CardDescription>
                  Technical details about our data sources and coverage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.values(SOURCE_CATEGORIES).map(category => {
                  const sources = getSourcesByCategory(category.id).filter(s => s.implemented);
                  if (sources.length === 0) return null;
                  
                  const IconComponent = category.icon === "newspaper" ? Newspaper : 
                                      category.icon === "users" ? Users :
                                      category.icon === "video" ? Video : Globe;
                  
                  return (
                    <div key={category.id} className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <IconComponent className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold">{category.name}</h3>
                        <Badge variant="secondary">{sources.length} source{sources.length > 1 ? 's' : ''}</Badge>
                      </div>
                      
                      <div className="grid gap-4">
                        {sources.map(source => (
                          <div key={source.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{source.name}</h4>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-xs text-green-600 font-medium">Active</span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground">{source.description}</p>
                            
                            {source.apiProvider && (
                              <div className="text-xs">
                                <span className="font-medium">API Provider:</span> {source.apiProvider}
                              </div>
                            )}
                            
                            {source.examples.length > 0 && (
                              <div>
                                <span className="text-xs font-medium block mb-1">Coverage Examples:</span>
                                <div className="flex flex-wrap gap-1">
                                  {source.examples.slice(0, 3).map((example, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {example}
                                    </Badge>
                                  ))}
                                  {source.examples.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{source.examples.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {source.limitations && source.limitations.length > 0 && (
                              <div>
                                <span className="text-xs font-medium block mb-1">Limitations:</span>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                  {source.limitations.map((limitation, idx) => (
                                    <li key={idx}>• {limitation}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {source.implementationNotes && (
                              <div className="bg-muted/50 rounded p-2">
                                <span className="text-xs font-medium block mb-1">Implementation Notes:</span>
                                <p className="text-xs text-muted-foreground">{source.implementationNotes}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                <div className="mt-6 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    This configuration is maintained in <code>src/config/sources.ts</code> and automatically 
                    updates the help documentation as new sources are implemented.
                  </p>
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
                      <Badge variant="outline">Basic User</Badge>
                      <span className="text-sm text-muted-foreground">Default role for new users</span>
                    </div>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• View and manage own brand mentions</li>
                      <li>• Generate personal reports</li>
                      <li>• Configure source preferences</li>
                      <li>• Access analytics dashboard</li>
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">PR User</Badge>
                      <span className="text-sm text-muted-foreground">Enhanced PR management capabilities</span>
                    </div>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• All Basic User permissions</li>
                      <li>• Advanced mention flagging and escalation</li>
                      <li>• PR-focused reporting tools</li>
                      <li>• Enhanced analytics for brand sentiment</li>
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Legal User</Badge>
                      <span className="text-sm text-muted-foreground">Legal team access and tools</span>
                    </div>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• All PR User permissions</li>
                      <li>• Legal escalation management</li>
                      <li>• Compliance reporting features</li>
                      <li>• Access to legal-specific mention categories</li>
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Moderator</Badge>
                      <span className="text-sm text-muted-foreground">Full system administration</span>
                    </div>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• All system permissions</li>
                      <li>• User management and role assignment</li>
                      <li>• Global settings configuration</li>
                      <li>• System monitoring and maintenance</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Global Settings</h3>
                    <p className="text-muted-foreground text-sm">
                      Moderators can configure system-wide settings including monitoring parameters, 
                      notification preferences, and integration configurations.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">User Management</h3>
                    <p className="text-muted-foreground text-sm">
                      Moderators can view all users, edit profiles, change user roles, 
                      and manage access permissions across the platform.
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
                    className="w-full flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Contact Support
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Email us at <strong>help@reputations.io</strong> for general support, 
                    account questions, or feature requests.
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
                    variant="outline"
                    className="w-full flex items-center gap-2"
                  >
                    <Bug className="h-4 w-4" />
                    Report Bug
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Email us at <strong>bugs@reputation.io</strong> to report technical issues, 
                    bugs, or system errors.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* FAQ Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Frequently Asked Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">How often are mentions updated?</h3>
                  <p className="text-sm text-muted-foreground">
                    Our system continuously monitors for new mentions. Most sources are checked multiple times per day, 
                    with some high-priority sources monitored in near real-time.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Can I customize which sources to monitor?</h3>
                  <p className="text-sm text-muted-foreground">
                    Yes! Use the Source Preferences feature to control which types of sources appear in your mentions, 
                    reports, and analytics. You can toggle individual source types on or off.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">What happens to flagged mentions?</h3>
                  <p className="text-sm text-muted-foreground">
                    Flagged mentions are highlighted in your dashboard and can be categorized by escalation type 
                    (legal, PR, customer service). This helps ensure important mentions get proper attention.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">How do I set up Google Alerts integration?</h3>
                  <p className="text-sm text-muted-foreground">
                    Create Google Alerts for your brand keywords, then copy the RSS feed URL from your Google Alerts settings. 
                    Paste this URL in your brand monitoring configuration to automatically import Google's findings.
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