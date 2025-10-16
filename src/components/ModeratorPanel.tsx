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
  source_name: string;
  content_snippet: string;
  sentiment: number;
  flagged: boolean;
  created_at: string;
  user_full_name: string;
}

export function ModeratorPanel() {
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
    google_alert_rss_url: '',
    brand_website: '',
    brand_description: '',
    social_media_links: {}
  });
  const [selectedUserKeywords, setSelectedUserKeywords] = useState<UserKeywords | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [resendingEmails, setResendingEmails] = useState<Set<string>>(new Set());
  const [sendingPasswordReset, setSendingPasswordReset] = useState<Set<string>>(new Set());
  const [deletingUsers, setDeletingUsers] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>('all');
  const [currentTab, setCurrentTab] = useState<string>('users');
  const [keywordSourceDialogOpen, setKeywordSourceDialogOpen] = useState(false);
  
  // Debug render counter
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log('🔧 [MODERATOR] Render #', renderCount.current, 'selectedUser:', selectedUser?.id, 'dialogOpen:', keywordSourceDialogOpen);
  const { toast } = useToast();



  // Helper function to check if a user can be edited by moderators
  const canEditUser = (userType: UserType) => {
    return userType === 'basic_user';
  };

  // Helper function to check if a user can be deleted
  const canDeleteUser = (user: User) => {
    // Get current user session to check if they're trying to delete themselves
    return supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return false;
      
      // Cannot delete yourself
      if (user.id === session.user.id) return false;
      
      // Only basic users can be deleted by moderators/admins
      // Admins can only be deleted by other admins
      return user.user_type === 'basic_user';
    });
  };

  // Helper function to get badge variant for user types
  const getUserBadgeVariant = (userType: UserType) => {
    switch (userType) {
      case 'admin': return 'destructive';
      case 'moderator': return 'default';
      case 'basic_user': return 'secondary';
      default: return 'secondary';
    }
  };

  // Helper function to get approval status badge variant
  const getApprovalStatusBadgeVariant = (status: string | undefined) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending_approval': return 'secondary';
      case 'rejected': return 'destructive';
      case 'suspended': return 'outline';
      default: return 'secondary';
    }
  };

  // Filter users based on approval status
  const filteredUsers = users.filter(user => {
    if (approvalStatusFilter === 'all') return true;
    return user.user_status === approvalStatusFilter;
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all users with their roles and profiles using authenticated backend API
      const response = await apiFetch('/admin/users-with-roles?include_inactive=false');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch users');
      }
      
      // Transform the data to match our interface
      const formattedUsers: User[] = result.data.map((user: any) => ({
        id: user.id,
        email: user.email || 'No email',
        full_name: user.profile?.full_name || 'No name',
        phone_number: user.profile?.phone_number || null,
        user_type: user.user_type,
        created_at: user.created_at,
        fetch_frequency_minutes: user.profile?.fetch_frequency_minutes || 15,
        email_confirmed: user.email_confirmed,
        email_confirmed_at: user.email_confirmed_at,
        brand_website: user.profile?.brand_website || null,
        brand_description: user.profile?.brand_description || null,
        social_media_links: user.profile?.social_media_links || {},
        user_status: user.profile?.user_status || 'approved',
        approved_at: user.profile?.approved_at || null,
        approved_by: user.profile?.approved_by || null,
        rejection_reason: user.profile?.rejection_reason || null
      }));

      console.log("📊 [MODERATOR PANEL] Loaded users data:", {
        totalUsers: formattedUsers.length,
        users: formattedUsers.map(u => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          brand_website: u.brand_website,
          brand_description: u.brand_description,
          social_media_links: u.social_media_links
        }))
      });

      // Fetch user keywords using authenticated backend endpoint
      const keywordsResponse = await apiFetch('/admin/user-keywords?include_all=true');
      const keywordsResult = await keywordsResponse.json();
      
      const formattedKeywords: UserKeywords[] = keywordsResult.success ? keywordsResult.data : [];
      
      console.log("🔑 [MODERATOR PANEL] Loaded keywords data:", {
        totalKeywords: formattedKeywords.length,
        keywords: formattedKeywords.map(k => ({
          id: k.id,
          user_id: k.user_id,
          brand_name: k.brand_name,
          google_alert_rss_url: k.google_alert_rss_url,
          google_alerts_enabled: k.google_alerts_enabled,
          variants: k.variants
        }))
      });

      // Fetch flagged mentions using authenticated backend endpoint
      const mentionsResponse = await apiFetch('/admin/flagged-mentions?flagged=true&limit=50');
      const mentionsResult = await mentionsResponse.json();

      const formattedMentions: FlaggedMention[] = mentionsResult.success ? mentionsResult.data : [];

      setUsers(formattedUsers);
      setUserKeywords(formattedKeywords);
      setFlaggedMentions(formattedMentions);
    } catch (error) {
      console.error("Error fetching moderator data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch moderator panel data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserType) => {
    try {
      const response = await apiFetch(`/admin/user-roles/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ user_type: newRole }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update user role');
      }

      toast({
        title: "Success",
        description: "User role updated successfully"
      });
      
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  const updateUserProfileBrand = async (userId: string, profileData: { brand_website?: string; brand_description?: string; social_media_links?: Record<string, string> }) => {
    try {
      console.log("🔧 [MODERATOR PANEL] Updating profile brand information", {
        userId,
        profileData
      });

      // Get auth token
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No authentication token');
      }

      // Use the backend API to update profile brand information
      const response = await apiFetch('/admin/update-user-profile-complete', {
        method: 'PUT',
        body: JSON.stringify({
          userId,
          brandWebsite: profileData.brand_website,
          brandDescription: profileData.brand_description,
          socialMediaLinks: profileData.social_media_links
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ [MODERATOR PANEL] Profile brand update successful:", result);

      toast({
        title: "Success",
        description: "Brand information updated successfully"
      });

      fetchData(); // Refresh data
    } catch (error) {
      console.error("❌ [MODERATOR PANEL] Error updating profile brand:", error);
      toast({
        title: "Error",
        description: "Failed to update brand information",
        variant: "destructive"
      });
    }
  };

  const updateUserBrand = async (keywordId: string, brandName: string, variants: string, rssUrl: string) => {
    try {
      console.log("🔧 [MODERATOR PANEL] ===== UPDATE USER BRAND START =====");
      console.log("🔧 [MODERATOR PANEL] Update parameters:", {
        keywordId,
        brandName,
        variants,
        rssUrl,
        hasRssUrl: !!rssUrl?.trim()
      });

      // Get the keyword to find user_id
      const keyword = userKeywords.find(k => k.id === keywordId);
      console.log("🔍 [MODERATOR PANEL] Found keyword:", keyword);
      
      if (!keyword) {
        console.error("❌ [MODERATOR PANEL] Keyword not found:", keywordId);
        throw new Error("Keyword not found");
      }

      // Get auth token
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('No authentication token');
      }

      console.log("🔧 [MODERATOR PANEL] Using backend API to update keywords...");
      
      // Get current profile data to preserve existing fields
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("full_name, phone_number, brand_website, brand_description, social_media_links")
        .eq("user_id", keyword.user_id)
        .single();

      console.log("🔍 [MODERATOR PANEL] Current profile data:", currentProfile);

      // Use the backend API to update keywords/brand information
      const response = await apiFetch('/admin/update-user-profile-complete', {
        method: 'PUT',
        body: JSON.stringify({
          userId: keyword.user_id,
          fullName: currentProfile?.full_name || 'Unknown User', // Preserve existing full_name
          phoneNumber: currentProfile?.phone_number || null,
          brandName: brandName,
          variants: variants,
          googleAlertRssUrl: rssUrl,
          brandWebsite: currentProfile?.brand_website || null,
          brandDescription: currentProfile?.brand_description || null,
          socialMediaLinks: currentProfile?.social_media_links || {}
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [MODERATOR PANEL] Backend API failed:", response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ [MODERATOR PANEL] Backend API response:", result);

      if (!result.success) {
        console.error("❌ [MODERATOR PANEL] Backend API returned error:", result.error);
        throw new Error(result.error || "Failed to update brand information");
      }

      console.log("✅ [MODERATOR PANEL] Keywords updated successfully");

      toast({
        title: "Success",
        description: "Brand information updated successfully"
      });
      
      console.log("🔧 [MODERATOR PANEL] Refreshing data...");
      fetchData(); // Refresh data
      console.log("✅ [MODERATOR PANEL] ===== UPDATE USER BRAND COMPLETE =====");
    } catch (error) {
      console.error("❌ [MODERATOR PANEL] Error updating brand:", error);
      toast({
        title: "Error",
        description: "Failed to update brand information",
        variant: "destructive"
      });
    }
  };

  const updateUserProfile = async (userId: string, profileData: typeof editingProfile) => {
    try {
      setIsUpdating(true);

      console.log("🔧 [MODERATOR PANEL] Starting user profile update", {
        userId,
        profileData: {
          full_name: profileData.full_name,
          email: profileData.email,
          brand_name: profileData.brand_name,
          google_alert_rss_url: profileData.google_alert_rss_url,
          brand_website: profileData.brand_website,
          brand_description: profileData.brand_description,
          social_media_links: profileData.social_media_links
        }
      });

      // Get auth token
      const { data: session } = await supabase.auth.getSession();
      console.log("🔐 [MODERATOR PANEL] Auth session:", {
        hasToken: !!session?.session?.access_token,
        tokenLength: session?.session?.access_token?.length || 0
      });

      const requestBody = {
        userId,
        fullName: profileData.full_name,
        phoneNumber: profileData.phone_number,
        email: profileData.email,
        brandName: profileData.brand_name,
        variants: profileData.variants,
        googleAlertRssUrl: profileData.google_alert_rss_url,
        brandWebsite: profileData.brand_website,
        brandDescription: profileData.brand_description,
        socialMediaLinks: profileData.social_media_links
      };

      console.log("📤 [MODERATOR PANEL] Request body:", requestBody);

      // Use authenticated backend API for complete profile update
      const response = await apiFetch('/admin/update-user-profile-complete', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      console.log("📡 [MODERATOR PANEL] API response status:", response.status, response.statusText);

      const result = await response.json();
      console.log("📥 [MODERATOR PANEL] API response body:", result);

      if (!response.ok) {
        console.error("❌ [MODERATOR PANEL] API request failed:", {
          status: response.status,
          statusText: response.statusText,
          error: result
        });
        throw new Error(result.error || 'Failed to update user profile');
      }

      if (!result.success) {
        console.error("❌ [MODERATOR PANEL] API returned success: false:", result);
        throw new Error(result.error || 'Failed to update user profile');
      }

      console.log("✅ [MODERATOR PANEL] Profile update successful:", result);

      toast({
        title: "Profile Updated",
        description: result.message || "User profile updated successfully"
      });

      setEditMode(false);
      console.log("🔄 [MODERATOR PANEL] Refreshing data...");
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error("💥 [MODERATOR PANEL] Error updating user profile:", {
        error: error.message,
        stack: error.stack,
        userId,
        profileData
      });
      toast({
        title: "Error",
        description: error.message || "Failed to update user profile",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
      console.log("🏁 [MODERATOR PANEL] Update process completed");
    }
  };

  const updateUserFetchFrequency = async (userId: string, frequency: number) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ fetch_frequency_minutes: frequency })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Frequency Updated",
        description: `Fetch frequency set to ${frequency} minutes`
      });

      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error updating fetch frequency:", error);
      toast({
        title: "Error",
        description: "Failed to update fetch frequency",
        variant: "destructive"
      });
    }
  };

  const resendEmailConfirmation = async (userId: string, email: string) => {
    try {
      setResendingEmails(prev => new Set(prev).add(userId));

      const response = await apiFetch(API_ENDPOINTS.RESEND_EMAIL_CONFIRMATION, {
        method: 'POST',
        body: JSON.stringify({ userId, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend email confirmation');
      }

      if (data.success) {
        toast({
          title: "Email Sent",
          description: `Confirmation email sent to ${email}`
        });
        
        // Refresh data to update email confirmation status
        fetchData();
      } else {
        toast({
          title: "Email Already Confirmed",
          description: data.message || "This email is already confirmed",
          variant: "default"
        });
      }
    } catch (error: any) {
      console.error("Error resending email confirmation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend email confirmation",
        variant: "destructive"
      });
    } finally {
      setResendingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const sendPasswordReset = async (userId: string, email: string) => {
    try {
      setSendingPasswordReset(prev => new Set(prev).add(userId));

      // Debug: Check session before making request
      const session = await supabase.auth.getSession();
      console.log('🔧 [PASSWORD_RESET] Session check:', {
        hasSession: !!session.data.session,
        hasAccessToken: !!session.data.session?.access_token,
        userRole: session.data.session?.user?.user_metadata?.role,
        userId: session.data.session?.user?.id,
        tokenLength: session.data.session?.access_token?.length,
        tokenPreview: session.data.session?.access_token?.substring(0, 50) + '...'
      });

      if (!session.data.session?.access_token) {
        throw new Error('No valid session found. Please sign in again.');
      }

      const response = await apiFetch(API_ENDPOINTS.SEND_PASSWORD_RESET, {
        method: 'POST',
        body: JSON.stringify({ userId, email }),
      });

      const data = await response.json();
      console.log('🔧 [PASSWORD_RESET] Response:', { status: response.status, data });

      if (!response.ok) {
        console.error('❌ [PASSWORD_RESET] Error response:', { status: response.status, data });
        throw new Error(data.error || data.message || `HTTP ${response.status}: Failed to send password reset email`);
      }

      if (data.success) {
        // Get the user's name from the users list for a better message
        const targetUser = users.find(u => u.id === userId);
        const actualEmail = data.data?.email || email;
        const userDisplayName = targetUser?.full_name || actualEmail || 'the user';
        
        toast({
          title: "Password Reset Sent",
          description: `Password reset email sent to ${userDisplayName}. The user can now set a new password without entering their old one.`
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send password reset email",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error sending password reset:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email",
        variant: "destructive"
      });
    } finally {
      setSendingPasswordReset(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const deleteUser = async (userId: string, reason: string) => {
    try {
      setDeletingUsers(prev => new Set(prev).add(userId));

      const session = await supabase.auth.getSession();
      console.log('🗑️ [DELETE_USER] Starting deletion process:', {
        targetUserId: userId,
        currentUserId: session.data.session?.user?.id,
        reason: reason
      });

      if (!session.data.session?.access_token) {
        throw new Error('No valid session found. Please sign in again.');
      }

      const response = await apiFetch(`${API_ENDPOINTS.DELETE_USER}-manual/${userId}`, {
        method: 'DELETE',
        body: JSON.stringify({ 
          confirmDelete: true,
          reason: reason || 'No reason provided'
        }),
      });

      const data = await response.json();
      console.log('🗑️ [DELETE_USER] Response:', { status: response.status, data });

      if (!response.ok) {
        console.error('❌ [DELETE_USER] Error response:', { status: response.status, data });
        throw new Error(data.error || data.message || `HTTP ${response.status}: Failed to delete user`);
      }

      if (data.success) {
        // Remove user from local state
        setUsers(prev => prev.filter(user => user.id !== userId));
        setUserKeywords(prev => prev.filter(keyword => keyword.user_id !== userId));
        
        // Close delete dialog
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        setDeleteReason('');
        
        toast({
          title: "User Deleted",
          description: data.message || `User has been permanently deleted.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete user",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive"
      });
    } finally {
      setDeletingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleDeleteUserClick = async (user: User) => {
    // Check if user can be deleted
    const canDelete = await canDeleteUser(user);
    if (!canDelete) {
      toast({
        title: "Cannot Delete User",
        description: user.user_type === 'basic_user' 
          ? "You cannot delete your own account" 
          : "Only basic users can be deleted by moderators",
        variant: "destructive"
      });
      return;
    }
    
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

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
      
      {/* Simple test dialog without Dialog component */}
      {keywordSourceDialogOpen && selectedUser && (
        <div 
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              border: '3px solid red',
              padding: '30px',
              borderRadius: '8px',
              maxWidth: '500px',
              textAlign: 'center'
            }}
          >
            <h2 style={{ color: 'red', marginBottom: '20px' }}>TEST DIALOG - NO COMPONENT LIBRARY</h2>
            <p><strong>User:</strong> {selectedUser.full_name}</p>
            <p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Dialog Open:</strong> {keywordSourceDialogOpen ? 'true' : 'false'}</p>
            <button 
              onClick={() => setKeywordSourceDialogOpen(false)}
              style={{
                backgroundColor: 'red',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                marginTop: '20px'
              }}
            >
              Close Dialog
            </button>
          </div>
        </div>
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

      {/* Desktop Navigation */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
        <TabsList className="hidden md:grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="keywords" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Keywords
          </TabsTrigger>
          <TabsTrigger value="mentions" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Flagged Mentions ({flaggedMentions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">User Management</CardTitle>
              <CardDescription>
                View and manage user roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filter controls */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="approval-filter" className="text-sm font-medium">Filter by Status:</Label>
                  <Select value={approvalStatusFilter} onValueChange={setApprovalStatusFilter}>
                    <SelectTrigger id="approval-filter" className="w-48">
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  Showing {filteredUsers.length} of {users.length} users
                </div>
              </div>
              
              {/* Enhanced User Cards - Both Desktop and Mobile */}
              <div className="space-y-4">
                {filteredUsers.map((user) => {
                  const canEdit = canEditUser(user.user_type);
                  const canDelete = user.user_type === 'basic_user';
                  console.log('🔧 [MODERATOR] User card for:', user.full_name, 'canEdit:', canEdit, 'user_type:', user.user_type);
                  
                  const loadingStates = {
                    deleting: deletingUsers.has(user.id),
                    passwordReset: sendingPasswordReset.has(user.id),
                    emailResend: resendingEmails.has(user.id)
                  };

                  const handleEdit = () => {
                    console.log('🔧 [MODERATOR] handleEdit called for user:', user.id, user.profile?.full_name);
                    console.log('🔧 [MODERATOR] handleEdit - user object:', user);
                    setSelectedUser(user);
                    const userKeyword = userKeywords.find(k => k.user_id === user.id);
                    setSelectedUserKeywords(userKeyword || null);
                    setEditingProfile({
                      full_name: user.profile?.full_name || '',
                      email: user.email,
                      phone_number: user.profile?.phone_number || '',
                      brand_name: userKeyword?.brand_name || '',
                      variants: userKeyword?.variants?.join(', ') || '',
                      google_alert_rss_url: userKeyword?.google_alert_rss_url || '',
                      brand_website: user.profile?.brand_website || '',
                      brand_description: user.profile?.brand_description || '',
                      social_media_links: user.profile?.social_media_links || {}
                    });
                    setEditMode(false);
                    setUserDetailOpen(true);
                    console.log('🔧 [MODERATOR] Dialog should now be open, userDetailOpen set to true');
                  };

                  const automationHandler = () => {
                    console.log('🔧 [MODERATOR] Configure Automation clicked for user:', user.id);
                    console.log('🔧 [MODERATOR] Setting selectedUser to:', user);
                    console.log('🔧 [MODERATOR] Setting keywordSourceDialogOpen to true');
                    setSelectedUser(user);
                    setKeywordSourceDialogOpen(true);
                  };

                  console.log('🔧 [MODERATOR] Creating EnhancedUserCard for user:', user.id, 'with automationHandler:', typeof automationHandler);

                  return (
                    <EnhancedUserCard
                      key={user.id}
                      user={user}
                      onEdit={handleEdit}
                      onConfigureAutomation={automationHandler}
                      onDelete={() => handleDeleteUserClick(user)}
                      onPasswordReset={() => sendPasswordReset(user.id, user.email)}
                      onEmailResend={() => resendEmailConfirmation(user.id, user.email)}
                      onRoleChange={(role: UserType) => updateUserRole(user.id, role)}
                      onFrequencyChange={(frequency: number) => updateUserFetchFrequency(user.id, frequency)}
                      loadingStates={loadingStates}
                      canEdit={canEdit}
                      canDelete={canDelete}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mentions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Flagged Mentions</CardTitle>
              <CardDescription>
                Review mentions that have been flagged for attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {flaggedMentions.map((mention) => (
                  <div key={mention.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="font-medium">{cleanHtmlContent(mention.source_name)}</span>
                        <Badge variant="destructive">Flagged</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(mention.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{cleanHtmlContent(mention.content_snippet)}</p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>User: {mention.user_full_name}</span>
                      <a 
                        href={mention.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View Source
                      </a>
                    </div>
                  </div>
                ))}
                {flaggedMentions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No flagged mentions found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Keyword × Source Management
              </CardTitle>
              <CardDescription>
                Select a user to configure automation and display preferences for their keywords and sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
                  <p className="text-muted-foreground">No users available for keyword-source configuration.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    Click on a user below to configure their keyword × source automation settings:
                  </div>
                  
                  <div className="grid gap-3">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          console.log('🔧 [MODERATOR] User clicked:', user);
                          setSelectedUser(user);
                          setKeywordSourceDialogOpen(true);
                          console.log('🔧 [MODERATOR] Dialog state should be set to true');
                          
                          // Test if state actually changed - use refs to avoid closure issues
                          const currentUser = user;
                          const currentDialogState = true;
                          setTimeout(() => {
                            console.log('🔧 [MODERATOR] State after timeout:', {
                              selectedUser: currentUser?.id,
                              dialogOpen: currentDialogState
                            });
                          }, 100);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{user.full_name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.user_type === 'moderator' ? 'default' : 'secondary'}>
                            {user.user_type.replace('_', ' ')}
                          </Badge>
                          <Settings className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                    <h4 className="font-semibold text-blue-900 mb-2">Configuration Features:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Configure automation per keyword × source combination</li>
                      <li>• Set display preferences (mentions, analytics, reports)</li>
                      <li>• Visual status indicators for automation state</li>
                      <li>• Real-time updates and comprehensive statistics</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Details Dialog */}
      <Dialog open={userDetailOpen} onOpenChange={setUserDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editMode ? 'Configure Brand Information' : 'Brand Information'}
            </DialogTitle>
            <DialogDescription>
              {editMode 
                ? `Edit brand information for ${selectedUser?.profile?.full_name || selectedUser?.full_name}`
                : `Brand information for ${selectedUser?.profile?.full_name || selectedUser?.full_name}`
              }
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              {!editMode ? (
                <>
                  <div className="grid gap-3">
                    <div>
                      <Label className="text-sm font-medium">Full Name</Label>
                      <p className="text-sm text-muted-foreground">{selectedUser.full_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground break-all">{selectedUser.email}</p>
                        <div className="flex items-center gap-2">
                          {selectedUser.email_confirmed ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <MailCheck className="h-4 w-4" />
                              <span className="text-xs">Confirmed</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-orange-600">
                              <Mail className="h-4 w-4" />
                              <span className="text-xs">Unconfirmed</span>
                            </div>
                          )}
                          <div className="flex gap-1">
                            {!selectedUser.email_confirmed && selectedUser.email !== 'Email not available' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resendEmailConfirmation(selectedUser.id, selectedUser.email)}
                                disabled={resendingEmails.has(selectedUser.id)}
                                className="h-7 px-2 text-xs"
                              >
                                {resendingEmails.has(selectedUser.id) ? 'Sending...' : 'Resend'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendPasswordReset(selectedUser.id, selectedUser.email)}
                              disabled={sendingPasswordReset.has(selectedUser.id)}
                              className="h-7 px-2 text-xs"
                            >
                              {sendingPasswordReset.has(selectedUser.id) ? 'Sending...' : 'Reset Password'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUserClick(selectedUser)}
                              disabled={deletingUsers.has(selectedUser.id)}
                              className="h-7 px-2 text-xs"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              {deletingUsers.has(selectedUser.id) ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Phone Number</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.phone_number || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Role</Label>
                      <Badge variant={selectedUser.user_type === 'moderator' ? 'default' : 'secondary'}>
                        {selectedUser.user_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    {selectedUserKeywords && (
                      <>
                        <div>
                          <Label className="text-sm font-medium">Brand Name</Label>
                          <p className="text-sm text-muted-foreground">{selectedUserKeywords.brand_name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Brand Variants</Label>
                          <p className="text-sm text-muted-foreground">
                            {selectedUserKeywords.variants?.join(', ') || 'None'}
                          </p>
                        </div>
                      </>
                    )}
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
                        <div className="mt-2">
                          <SocialMediaLinks
                            value={selectedUser.social_media_links}
                            onChange={() => {}} // Read-only in view mode
                            showLabels={false}
                            disabled={true}
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium">Member Since</Label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedUser.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Brand Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">Brand Information</h3>
                    </div>
                    
                    {selectedUserKeywords ? (
                      <div className="grid gap-3">
                        <div>
                          <Label className="text-sm font-medium">Brand Name</Label>
                          <p className="text-sm text-muted-foreground">{selectedUserKeywords.brand_name || 'Not set'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Brand Variants</Label>
                          <p className="text-sm text-muted-foreground">
                            {selectedUserKeywords.variants?.join(', ') || 'None'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">No brand information available</p>
                      </div>
                    )}
                  </div>
                  
                   <div className="flex flex-col sm:flex-row justify-end gap-2">
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
                        type="tel"
                        value={editingProfile.phone_number}
                        onChange={(e) => setEditingProfile(prev => ({ ...prev, phone_number: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-brand">Brand Name</Label>
                      <Input
                        id="edit-brand"
                        value={editingProfile.brand_name}
                        onChange={(e) => setEditingProfile(prev => ({ ...prev, brand_name: e.target.value }))}
                        placeholder="Enter brand name"
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
                      <Label htmlFor="edit-brand-website">Brand Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="edit-brand-website"
                          type="url"
                          value={editingProfile.brand_website}
                          onChange={(e) => setEditingProfile(prev => ({ ...prev, brand_website: e.target.value }))}
                          placeholder="https://yourcompany.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="edit-brand-description">Brand Description</Label>
                      <Textarea
                        id="edit-brand-description"
                        value={editingProfile.brand_description}
                        onChange={(e) => setEditingProfile(prev => ({ ...prev, brand_description: e.target.value }))}
                        placeholder="Describe your brand, including products/services and target audience..."
                        rows={4}
                        maxLength={2000}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {editingProfile.brand_description.length}/2000 characters
                      </p>
                    </div>
                    <div>
                      <Label>Social Media Links</Label>
                      <SocialMediaLinks
                        value={editingProfile.social_media_links}
                        onChange={(links) => setEditingProfile(prev => ({ ...prev, social_media_links: links }))}
                        showLabels={true}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditMode(false);
                        setEditingProfile({
                          full_name: selectedUser.full_name,
                          email: selectedUser.email,
                          phone_number: selectedUser.phone_number || '',
                          brand_name: selectedUserKeywords?.brand_name || '',
                          variants: selectedUserKeywords?.variants?.join(', ') || '',
                          google_alert_rss_url: selectedUserKeywords?.google_alert_rss_url || '',
                          brand_website: selectedUser.brand_website || '',
                          brand_description: selectedUser.brand_description || '',
                          social_media_links: selectedUser.social_media_links || {}
                        });
                      }}
                      disabled={isUpdating}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => updateUserProfile(selectedUser.id, editingProfile)}
                      disabled={isUpdating || !editingProfile.full_name.trim()}
                      className="w-full sm:w-auto"
                    >
                      {isUpdating ? 'Saving...' : 'Save Changes'}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete User Account
            </DialogTitle>
            <DialogDescription>
              This action will permanently delete the user account and all associated data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {userToDelete && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold text-red-800 mb-2">User to be deleted:</h4>
                <div className="space-y-1 text-sm text-red-700">
                  <p><strong>Name:</strong> {userToDelete.full_name}</p>
                  <p><strong>Email:</strong> {userToDelete.email}</p>
                  <p><strong>Role:</strong> {userToDelete.user_type.replace('_', ' ')}</p>
                  <p><strong>Created:</strong> {new Date(userToDelete.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-reason" className="text-sm font-medium">
                  Reason for deletion (required):
                </Label>
                <Textarea
                  id="delete-reason"
                  placeholder="Enter the reason for deleting this user account..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setUserToDelete(null);
                    setDeleteReason('');
                  }}
                  disabled={deletingUsers.has(userToDelete.id)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteUser(userToDelete.id, deleteReason)}
                  disabled={deletingUsers.has(userToDelete.id) || !deleteReason.trim()}
                  className="min-w-[100px]"
                >
                  {deletingUsers.has(userToDelete.id) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete User
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
  );
}

interface BrandEditorProps {
  keyword: UserKeywords;
  user: User;
  onUpdate: (keywordId: string, brandName: string, variants: string, rssUrl: string) => void;
  onUpdateProfile: (userId: string, profileData: { brand_website?: string; brand_description?: string; social_media_links?: Record<string, string> }) => void;
}

export function BrandEditor({ keyword, user, onUpdate, onUpdateProfile }: BrandEditorProps) {
  const [brandName, setBrandName] = useState(keyword.brand_name);
  const [variants, setVariants] = useState(keyword.variants?.join(', ') || '');
  const [rssUrl, setRssUrl] = useState(keyword.google_alert_rss_url || '');
  const [brandWebsite, setBrandWebsite] = useState(user?.brand_website || '');
  const [brandDescription, setBrandDescription] = useState(user?.brand_description || '');
  const [socialMediaLinks, setSocialMediaLinks] = useState<Record<string, string>>(user?.social_media_links || {});
  const [isEditing, setIsEditing] = useState(false);

  // RSS URL validation function
  const validateRssUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return true; // Empty is valid (optional field)
    try {
      const parsedUrl = new URL(url);
      return (parsedUrl.hostname.includes('google.com') || parsedUrl.hostname.includes('google.co.uk')) && 
             parsedUrl.pathname.includes('/alerts/feeds/');
    } catch {
      return false;
    }
  };

  const handleSave = () => {
    // Update keywords (brand name, variants, RSS URL)
    onUpdate(keyword.id, brandName, variants, rssUrl);
    
    // Update profile brand information (website, description, social media)
    onUpdateProfile(user.id, {
      brand_website: brandWebsite || undefined,
      brand_description: brandDescription || undefined,
      social_media_links: Object.keys(socialMediaLinks).length > 0 ? socialMediaLinks : undefined
    });
    
    setIsEditing(false);
  };

  const handleCancel = () => {
    setBrandName(keyword.brand_name);
    setVariants(keyword.variants?.join(', ') || '');
    setRssUrl(keyword.google_alert_rss_url || '');
    setBrandWebsite(user?.brand_website || '');
    setBrandDescription(user?.brand_description || '');
    setSocialMediaLinks(user?.social_media_links || {});
    setIsEditing(false);
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h4 className="font-medium">{keyword.brand_name}</h4>
          <p className="text-sm text-muted-foreground">User: {keyword.user_full_name}</p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button size="sm" onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
              Edit
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={handleCancel} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="flex-1 sm:flex-none">
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="grid gap-4">
          {/* Brand Name and Variants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`brand-${keyword.id}`}>Brand Name</Label>
              <Input
                id={`brand-${keyword.id}`}
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`variants-${keyword.id}`}>Variants (comma-separated)</Label>
              <Input
                id={`variants-${keyword.id}`}
                value={variants}
                onChange={(e) => setVariants(e.target.value)}
                placeholder="variant1, variant2, variant3"
              />
            </div>
          </div>

          {/* Brand Website */}
          <div>
            <Label htmlFor={`website-${keyword.id}`}>Brand Website</Label>
            <Input
              id={`website-${keyword.id}`}
              type="url"
              value={brandWebsite}
              onChange={(e) => setBrandWebsite(e.target.value)}
              placeholder="https://www.example.com"
            />
          </div>

          {/* Brand Description */}
          <div>
            <Label htmlFor={`description-${keyword.id}`}>Brand Description</Label>
            <Textarea
              id={`description-${keyword.id}`}
              value={brandDescription}
              onChange={(e) => setBrandDescription(e.target.value)}
              placeholder="Tell us about your brand..."
              rows={3}
            />
          </div>

          {/* Social Media Links */}
          <div>
            <Label>Social Media Links</Label>
            <SocialMediaLinks
              value={socialMediaLinks}
              onChange={setSocialMediaLinks}
            />
          </div>

          {/* RSS URL */}
          <div>
            <Label htmlFor={`rss-${keyword.id}`}>Google Alert RSS URL</Label>
            <Textarea
              id={`rss-${keyword.id}`}
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              placeholder="https://www.google.com/alerts/feeds/... or https://www.google.co.uk/alerts/feeds/..."
              rows={3}
              className={!validateRssUrl(rssUrl) && rssUrl ? 'border-red-500' : ''}
            />
            <p className="text-xs text-muted-foreground mt-1">
              💡 <strong>Tip:</strong> You can use the same RSS URL for multiple keywords if they're related. 
              The system will automatically deduplicate processing for better performance.
            </p>
            {!validateRssUrl(rssUrl) && rssUrl && (
              <p className="text-xs text-red-600 mt-1">
                ⚠️ Please enter a valid Google Alerts RSS URL (should contain "google.com" or "google.co.uk" and "/alerts/feeds/")
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Brand Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <span className="text-sm font-medium">Variants: </span>
              <span className="text-sm">{keyword.variants?.join(', ') || 'None'}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Google Alert RSS: </span>
              <span className="text-sm">
                {keyword.google_alert_rss_url ? (
                  <a 
                    href={keyword.google_alert_rss_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    Configured
                  </a>
                ) : (
                  'Not configured'
                )}
              </span>
            </div>
          </div>

          {/* Brand Website */}
          {user?.brand_website && (
            <div>
              <span className="text-sm font-medium">Brand Website: </span>
              <a 
                href={user.brand_website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline break-all"
              >
                {user.brand_website}
              </a>
            </div>
          )}

          {/* Brand Description */}
          {user?.brand_description && (
            <div>
              <span className="text-sm font-medium">Brand Description: </span>
              <span className="text-sm text-muted-foreground whitespace-pre-wrap">
                {user.brand_description}
              </span>
            </div>
          )}

          {/* Social Media Links */}
          {user?.social_media_links && user.social_media_links && typeof user.social_media_links === 'object' && Object.keys(user.social_media_links).length > 0 && (
            <div>
              <span className="text-sm font-medium">Social Media: </span>
              <div className="mt-1">
                <SocialMediaLinks
                  value={user.social_media_links || {}}
                  onChange={() => {}} // Read-only in view mode
                  showLabels={false}
                  disabled={true}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keyword Source Management Dialog */}
      {selectedUser && (
        <KeywordSourceManagement
          userId={selectedUser.id}
          userName={selectedUser.profile?.full_name || selectedUser.full_name}
          open={keywordSourceDialogOpen}
          onClose={() => setKeywordSourceDialogOpen(false)}
        />
      )}

      {/* Console log for debugging */}
      {console.log('🔧 [MODERATOR] Always render test - dialogOpen:', keywordSourceDialogOpen, 'selectedUser:', selectedUser?.id)}
      </div>
    </>
  );
}

// BrandEditor function ends here