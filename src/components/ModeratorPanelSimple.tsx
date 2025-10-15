import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cleanHtmlContent } from "@/lib/contentUtils";
import { supabase } from "@/integrations/supabase/client";
import { Users, Flag, Settings, Settings as SettingsIcon, AlertTriangle, Eye, Mail, MailCheck, Globe, Building2, Trash2, RefreshCw } from "lucide-react";
import { SocialMediaLinks } from "@/components/SocialMediaLinks";
import type { UserType } from "@/hooks/use-user-role";
import { GlobalSettingSwitch } from "@/components/GlobalSettingSwitch";
import { API_ENDPOINTS, createApiUrl, apiFetch } from "@/lib/api";
import { EnhancedUserCard } from "@/components/ui/enhanced-user-card";
import { StatusIndicator, EmailStatusIndicator, UserStatusIndicator } from "@/components/ui/status-indicator";
import { MobileNavBar } from "@/components/ui/mobile-nav-bar";
import { UserBrandInfoSection } from "@/components/UserBrandInfoSection";
import { KeywordSourceManagement } from "@/components/KeywordSourceManagement";
import { BrandEditor } from "@/components/BrandEditor";

interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  user_type: UserType;
  created_at: string;
  fetch_frequency_minutes: number;
  email_confirmed?: boolean;
  email_confirmed_at?: string | null;
  brand_website?: string | null;
  brand_description?: string | null;
  social_media_links?: Record<string, string>;
  user_status?: 'pending_approval' | 'approved' | 'rejected' | 'suspended';
  approved_at?: string | null;
  approved_by?: string | null;
  rejection_reason?: string | null;
}

interface UserKeywords {
  id: string;
  user_id: string;
  brand_name: string;
  variants: string[] | null;
  google_alert_rss_url: string | null;
  google_alerts_enabled: boolean;
  user_full_name: string;
}

interface FlaggedMention {
  id: string;
  user_id: string;
  source_url: string;
  title: string;
  content_snippet: string;
  sentiment: number;
  flagged: boolean;
  created_at: string;
  user_full_name: string;
}

export function ModeratorPanelSimple() {
  const [users, setUsers] = useState<User[]>([]);
  const [userKeywords, setUserKeywords] = useState<UserKeywords[]>([]);
  const [flaggedMentions, setFlaggedMentions] = useState<FlaggedMention[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingProfile, setEditingProfile] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    brand_name: '',
    variants: '',
    rss_url: '',
    brand_website: '',
    brand_description: '',
    social_media_links: {} as Record<string, string>
  });
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>('all');
  const [currentTab, setCurrentTab] = useState<string>('users');
  const [keywordSourceDialogOpen, setKeywordSourceDialogOpen] = useState(false);
  
  // Debug render counter (can be removed once everything is working)
  const renderCount = useRef(0);
  renderCount.current += 1;
  const { toast } = useToast();

  // Helper function to check if a user can be edited by moderators
  const canEditUser = (user: User): boolean => {
    return user.user_status !== 'suspended' && user.user_type !== 'admin';
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users with roles
      const usersResponse = await apiFetch('/admin/users-with-roles');
      if (!usersResponse.ok) throw new Error('Failed to fetch users');
      const usersResult = await usersResponse.json();
      
      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data);
        console.log('📊 [MODERATOR PANEL] Loaded users data:', { totalUsers: usersResult.data.length, users: usersResult.data });
      }

      // Fetch keywords
      const keywordsResponse = await apiFetch('/admin/keywords-management');
      if (!keywordsResponse.ok) throw new Error('Failed to fetch keywords');
      const keywordsResult = await keywordsResponse.json();
      
      if (keywordsResult.success && keywordsResult.data) {
        setUserKeywords(keywordsResult.data);
        console.log('🔑 [MODERATOR PANEL] Loaded keywords data:', { totalKeywords: keywordsResult.data.length, keywords: keywordsResult.data });
      }

      // Fetch flagged mentions
      const mentionsResponse = await apiFetch('/admin/flagged-mentions');
      if (!mentionsResponse.ok) throw new Error('Failed to fetch flagged mentions');
      const mentionsResult = await mentionsResponse.json();
      
      if (mentionsResult.success && mentionsResult.data) {
        setFlaggedMentions(mentionsResult.data);
      }
    } catch (error) {
      console.error('Error fetching moderator data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch moderator data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading moderator panel...</div>
      </div>
    );
  }

  return (
    <>
      {/* Debug elements outside of any containers */}
      <div 
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          backgroundColor: 'yellow',
          border: '2px solid red',
          padding: '10px',
          borderRadius: '4px',
          zIndex: 99999,
          fontSize: '12px',
          color: 'black'
        }}
      >
        DEBUG: dialogOpen={keywordSourceDialogOpen ? 'true' : 'false'}, selectedUser={selectedUser?.id || 'none'}
      </div>
      
      {/* Keyword Source Management Dialog */}
      {selectedUser && (
        <KeywordSourceManagement
          userId={selectedUser.id}
          userName={selectedUser.full_name}
          open={keywordSourceDialogOpen}
          onClose={() => setKeywordSourceDialogOpen(false)}
        />
      )}
      
      <div className="space-y-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Moderator Panel</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage users, monitor flagged mentions, and configure brand settings
            </p>
          </div>
          <Button onClick={fetchData} variant="outline" className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="flagged">Flagged Mentions ({flaggedMentions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={approvalStatusFilter} onValueChange={setApprovalStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedUser(user);
                      setKeywordSourceDialogOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{user.full_name}</h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {user.user_type}
                          </Badge>
                          <StatusIndicator status={user.user_status || 'pending_approval'} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(user);
                          setKeywordSourceDialogOpen(true);
                        }}
                        className="w-full sm:w-auto"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configure Automation
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="keywords" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Keyword x Source Management</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select a user to configure automation and display preferences for their keywords and sources
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Click on a user below to configure their keyword x source automation settings:
                </p>
              </div>

              <div className="grid gap-4">
                {userKeywords.map((keyword) => (
                  <BrandEditor
                    key={keyword.id}
                    keyword={keyword}
                    user={users.find(u => u.id === keyword.user_id) || {} as User}
                    onUpdate={() => {}} // TODO: Implement
                    onUpdateProfile={() => {}} // TODO: Implement
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="flagged" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Flagged Mentions</h3>
                <p className="text-sm text-muted-foreground">
                  Review and manage flagged mentions that require attention
                </p>
              </div>

              <div className="space-y-4">
                {flaggedMentions.map((mention) => (
                  <Card key={mention.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{mention.title}</CardTitle>
                      <CardDescription>
                        User: {mention.user_full_name} • {new Date(mention.created_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        {cleanHtmlContent(mention.content_snippet)}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant={mention.sentiment > 0 ? "default" : "destructive"}>
                          Sentiment: {mention.sentiment}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Mobile Navigation Bar */}
        <MobileNavBar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          badgeCounts={{
            users: users.length,
            mentions: flaggedMentions.length,
            brands: userKeywords.length
          }}
        />
      </div>
    </>
  );
}
