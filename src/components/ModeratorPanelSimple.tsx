import { useState, useEffect } from "react";
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
import { extractBrandInfo, type StandardizedKeyword } from "@/lib/keywordUtils";

interface User {
  id: string;
  email: string;
  full_name?: string; // This might be undefined if it's in profile
  phone_number?: string | null;
  user_type: UserType;
  created_at: string;
  fetch_frequency_minutes?: number; // This might be in profile
  email_confirmed?: boolean;
  email_confirmed_at?: string | null;
  brand_website?: string | null;
  brand_description?: string | null;
  social_media_links?: Record<string, string>;
  user_status?: 'pending_approval' | 'approved' | 'rejected' | 'suspended';
  approved_at?: string | null;
  approved_by?: string | null;
  rejection_reason?: string | null;
  profile?: {
    full_name?: string;
    phone_number?: string | null;
    fetch_frequency_minutes?: number;
    automation_enabled?: boolean;
    timezone?: string;
    user_status?: 'pending_approval' | 'approved' | 'rejected' | 'suspended';
    approved_at?: string | null;
    approved_by?: string | null;
    rejection_reason?: string | null;
    created_by_staff?: boolean;
    notification_preferences?: any;
    brand_website?: string | null;
    brand_description?: string | null;
    social_media_links?: Record<string, string>;
  };
}

// Use the standardized keyword interface
type UserKeywords = StandardizedKeyword;

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
  
  const { toast } = useToast();

  // Helper function to check if a user can be edited by moderators/admins
  const canEditUser = (user: User): boolean => {
    const userStatus = user.user_status || user.profile?.user_status;
    // Allow editing of non-suspended users (moderators and admins can edit all non-suspended users)
    return userStatus !== 'suspended';
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

      // Fetch keywords for all users (moderator panel needs to see all users' keywords)
      const keywordsResponse = await apiFetch('/admin/keywords-management?include_all=true');
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
      
      {/* Keyword Source Management Dialog */}
      {selectedUser && (
        <KeywordSourceManagement
          userId={selectedUser.id}
          userName={selectedUser.full_name || selectedUser.profile?.full_name || selectedUser.email || 'Unknown User'}
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
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
                {users.map((user) => {
                  const handleEdit = () => {
                    setSelectedUser(user);
                    const userKeywordsList = userKeywords.filter(k => k.user_id === user.id);
                    const brandInfo = extractBrandInfo(userKeywordsList);
                    
                    
                    setEditingProfile({
                      full_name: user.full_name || user.profile?.full_name || '',
                      email: user.email,
                      phone_number: user.phone_number || user.profile?.phone_number || '',
                      brand_name: brandInfo.brand_name,
                      variants: brandInfo.variants.join(', '),
                      rss_url: '',
                      brand_website: user.brand_website || user.profile?.brand_website || '',
                      brand_description: user.brand_description || user.profile?.brand_description || '',
                      social_media_links: user.social_media_links || user.profile?.social_media_links || {}
                    });
                    setUserDetailOpen(true);
                    setEditMode(true);
                  };

                  const handleDeleteUserClick = (userToDelete: User) => {
                    setUserToDelete(userToDelete);
                    setDeleteDialogOpen(true);
                  };

                  const handleDeleteUser = async () => {
                    if (!userToDelete) return;
                    
                    try {
                      const response = await apiFetch('/admin/delete-user', {
                        method: 'DELETE',
                        body: JSON.stringify({
                          userId: userToDelete.id,
                          reason: deleteReason
                        })
                      });

                      if (!response.ok) {
                        throw new Error('Failed to delete user');
                      }

                      toast({
                        title: "User deleted",
                        description: `${userToDelete.full_name} has been deleted.`,
                      });

                      setDeleteDialogOpen(false);
                      setUserToDelete(null);
                      setDeleteReason('');
                      fetchData(); // Refresh the data
                    } catch (error) {
                      console.error('Error deleting user:', error);
                      toast({
                        title: "Error",
                        description: "Failed to delete user",
                        variant: "destructive"
                      });
                    }
                  };

                  const updateUserRole = async (userId: string, role: UserType) => {
                    setLoadingStates(prev => ({ ...prev, [`role-${userId}`]: true }));
                    try {
                      const response = await apiFetch('/admin/update-user-role', {
                        method: 'PUT',
                        body: JSON.stringify({ userId, role })
                      });

                      if (!response.ok) {
                        throw new Error('Failed to update user role');
                      }

                      toast({
                        title: "Role updated",
                        description: "User role has been updated successfully.",
                      });

                      fetchData(); // Refresh the data
                    } catch (error) {
                      console.error('Error updating user role:', error);
                      toast({
                        title: "Error",
                        description: "Failed to update user role",
                        variant: "destructive"
                      });
                    } finally {
                      setLoadingStates(prev => ({ ...prev, [`role-${userId}`]: false }));
                    }
                  };

                  const updateUserFetchFrequency = async (userId: string, frequency: number) => {
                    setLoadingStates(prev => ({ ...prev, [`frequency-${userId}`]: true }));
                    try {
                      const response = await apiFetch('/admin/update-user-fetch-frequency', {
                        method: 'PUT',
                        body: JSON.stringify({ userId, frequency })
                      });

                      if (!response.ok) {
                        throw new Error('Failed to update fetch frequency');
                      }

                      toast({
                        title: "Frequency updated",
                        description: "User fetch frequency has been updated successfully.",
                      });

                      fetchData(); // Refresh the data
                    } catch (error) {
                      console.error('Error updating fetch frequency:', error);
                      toast({
                        title: "Error",
                        description: "Failed to update fetch frequency",
                        variant: "destructive"
                      });
                    } finally {
                      setLoadingStates(prev => ({ ...prev, [`frequency-${userId}`]: false }));
                    }
                  };

                  const resendEmailConfirmation = async (userId: string, email: string) => {
                    setLoadingStates(prev => ({ ...prev, [`email-${userId}`]: true }));
                    try {
                      const response = await apiFetch('/admin/resend-email-confirmation', {
                        method: 'POST',
                        body: JSON.stringify({ userId, email })
                      });

                      if (!response.ok) {
                        throw new Error('Failed to resend email confirmation');
                      }

                      toast({
                        title: "Email sent",
                        description: "Email confirmation has been resent.",
                      });
                    } catch (error) {
                      console.error('Error resending email confirmation:', error);
                      toast({
                        title: "Error",
                        description: "Failed to resend email confirmation",
                        variant: "destructive"
                      });
                    } finally {
                      setLoadingStates(prev => ({ ...prev, [`email-${userId}`]: false }));
                    }
                  };

                  const sendPasswordReset = async (userId: string, email: string) => {
                    setLoadingStates(prev => ({ ...prev, [`password-${userId}`]: true }));
                    try {
                      const response = await apiFetch('/admin/send-password-reset', {
                        method: 'POST',
                        body: JSON.stringify({ userId, email })
                      });

                      if (!response.ok) {
                        throw new Error('Failed to send password reset');
                      }

                      toast({
                        title: "Password reset sent",
                        description: "Password reset email has been sent.",
                      });
                    } catch (error) {
                      console.error('Error sending password reset:', error);
                      toast({
                        title: "Error",
                        description: "Failed to send password reset",
                        variant: "destructive"
                      });
                    } finally {
                      setLoadingStates(prev => ({ ...prev, [`password-${userId}`]: false }));
                    }
                  };

                  return (
                    <EnhancedUserCard
                      key={user.id}
                      user={user}
                      onEdit={handleEdit}
                      onConfigureAutomation={() => {
                        setSelectedUser(user);
                        setKeywordSourceDialogOpen(true);
                      }}
                      onDelete={() => handleDeleteUserClick(user)}
                      onPasswordReset={() => sendPasswordReset(user.id, user.email)}
                      onEmailResend={() => resendEmailConfirmation(user.id, user.email)}
                      onRoleChange={(role: UserType) => updateUserRole(user.id, role)}
                      onFrequencyChange={(frequency: number) => updateUserFetchFrequency(user.id, frequency)}
                      loadingStates={loadingStates}
                      canEdit={canEditUser(user)}
                      canDelete={canEditUser(user)}
                    />
                  );
                })}
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

        {/* User Detail Dialog */}
        <Dialog open={userDetailOpen} onOpenChange={setUserDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editMode ? 'Edit User' : 'User Details'}
              </DialogTitle>
              <DialogDescription>
                {editMode ? 'Update user information and settings' : 'View user information and manage settings'}
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-6">
                {!editMode ? (
                  <>
                    {/* View Mode - User Profile Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">User Information</h3>
                      </div>
                      
                      <div className="grid gap-3">
                        <div>
                          <Label className="text-sm font-medium">Full Name</Label>
                          <p className="text-sm text-muted-foreground">{selectedUser.full_name || selectedUser.profile?.full_name || 'Not set'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Email</Label>
                          <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Phone Number</Label>
                          <p className="text-sm text-muted-foreground">{selectedUser.phone_number || selectedUser.profile?.phone_number || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Role</Label>
                          <Badge variant={selectedUser.user_type === 'moderator' ? 'default' : 'secondary'}>
                            {selectedUser.user_type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* View Mode - Brand Information Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">Brand Information</h3>
                      </div>
                      
                      {(() => {
                        const userKeywordsList = userKeywords.filter(k => k.user_id === selectedUser.id);
                        const brandInfo = extractBrandInfo(userKeywordsList);
                        return brandInfo.brand_name ? (
                          <div className="grid gap-3">
                            <div>
                              <Label className="text-sm font-medium">Brand Name</Label>
                              <p className="text-sm text-muted-foreground">{brandInfo.brand_name}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Brand Variants</Label>
                              <p className="text-sm text-muted-foreground">
                                {brandInfo.variants.length > 0 ? brandInfo.variants.join(', ') : 'None'}
                              </p>
                            </div>
                            {selectedUser.brand_website && (
                              <div>
                                <Label className="text-sm font-medium">Brand Website</Label>
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  <a 
                                    href={selectedUser.brand_website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline break-all"
                                  >
                                    {selectedUser.brand_website}
                                  </a>
                                </div>
                              </div>
                            )}
                            {selectedUser.brand_description && (
                              <div>
                                <Label className="text-sm font-medium">Brand Description</Label>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {selectedUser.brand_description}
                                </p>
                              </div>
                            )}
                            {selectedUser.social_media_links && Object.keys(selectedUser.social_media_links).length > 0 && (
                              <div>
                                <Label className="text-sm font-medium">Social Media Links</Label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {Object.entries(selectedUser.social_media_links).map(([platform, url]) => (
                                    <a
                                      key={platform}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                                    >
                                      {platform}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground">No brand information available</p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* View Mode - Dialog Actions */}
                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setUserDetailOpen(false)} className="w-full sm:w-auto">
                        Close
                      </Button>
                      <Button onClick={() => setEditMode(true)} className="w-full sm:w-auto">
                        Configure Brand
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Edit Mode - Brand Configuration Form */}
                    <div className="space-y-4" key={`edit-form-${selectedUser.id}`}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">Configure Brand Information</h3>
                      </div>
                      
                      <div className="grid gap-4">
                        
                        <div>
                          <Label htmlFor="edit-fullname">Full Name</Label>
                          <Input
                            id="edit-fullname"
                            value={editingProfile.full_name}
                            onChange={(e) => setEditingProfile(prev => ({ ...prev, full_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-email">Email</Label>
                          <Input
                            id="edit-email"
                            type="email"
                            value={editingProfile.email}
                            onChange={(e) => setEditingProfile(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-phone">Phone Number</Label>
                          <Input
                            id="edit-phone"
                            value={editingProfile.phone_number}
                            onChange={(e) => setEditingProfile(prev => ({ ...prev, phone_number: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-brand-name">Brand Name</Label>
                          <Input
                            id="edit-brand-name"
                            value={editingProfile.brand_name}
                            onChange={(e) => setEditingProfile(prev => ({ ...prev, brand_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-variants">Brand Variants (comma-separated)</Label>
                          <Input
                            id="edit-variants"
                            value={editingProfile.variants}
                            onChange={(e) => setEditingProfile(prev => ({ ...prev, variants: e.target.value }))}
                            placeholder="variant1, variant2, variant3"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-website">Brand Website</Label>
                          <Input
                            id="edit-website"
                            value={editingProfile.brand_website}
                            onChange={(e) => setEditingProfile(prev => ({ ...prev, brand_website: e.target.value }))}
                            placeholder="https://example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-description">Brand Description</Label>
                          <Textarea
                            id="edit-description"
                            value={editingProfile.brand_description}
                            onChange={(e) => setEditingProfile(prev => ({ ...prev, brand_description: e.target.value }))}
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Social Media Links</Label>
                          <SocialMediaLinks
                            value={editingProfile.social_media_links}
                            onChange={(links) => setEditingProfile(prev => ({ ...prev, social_media_links: links }))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Edit Mode - Dialog Actions */}
                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setEditMode(false)} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                      <Button onClick={async () => {
                        try {

                          // Update keywords (brand name and variants)
                          // Update user profile and brand information in one call
                          const profileResponse = await apiFetch('/admin/update-user-profile-complete', {
                            method: 'PUT',
                            body: JSON.stringify({
                              userId: selectedUser.id,
                              fullName: editingProfile.full_name,
                              phoneNumber: editingProfile.phone_number,
                              brandName: editingProfile.brand_name,
                              variants: editingProfile.variants, // Send as string (comma-separated)
                              brandWebsite: editingProfile.brand_website,
                              brandDescription: editingProfile.brand_description,
                              socialMediaLinks: editingProfile.social_media_links
                            })
                          });
                          
                          const profileData = await profileResponse.json();
                          
                          if (!profileData.success) {
                            throw new Error(profileData.error || "Failed to update profile");
                          }
                          
                          setEditMode(false);
                          fetchData(); // Refresh the data
                          toast({
                            title: "Success",
                            description: "Brand information updated successfully"
                          });
                        } catch (error: any) {
                          console.error('Error saving brand info:', error);
                          toast({
                            title: "Error",
                            description: error.message || "Failed to update brand information",
                            variant: "destructive"
                          });
                        }
                      }} className="w-full sm:w-auto">
                        Save Changes
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {userToDelete?.full_name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="deleteReason">Reason for deletion (optional)</Label>
                <Textarea
                  id="deleteReason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Enter reason for deletion..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setUserToDelete(null);
                    setDeleteReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!userToDelete) return;
                    
                    try {
                      const response = await apiFetch('/admin/delete-user', {
                        method: 'DELETE',
                        body: JSON.stringify({
                          userId: userToDelete.id,
                          reason: deleteReason
                        })
                      });

                      if (!response.ok) {
                        throw new Error('Failed to delete user');
                      }

                      toast({
                        title: "User deleted",
                        description: `${userToDelete.full_name} has been deleted.`,
                      });

                      setDeleteDialogOpen(false);
                      setUserToDelete(null);
                      setDeleteReason('');
                      fetchData(); // Refresh the data
                    } catch (error) {
                      console.error('Error deleting user:', error);
                      toast({
                        title: "Error",
                        description: "Failed to delete user",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  Delete User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
