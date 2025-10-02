import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createApiUrl } from "@/lib/api";
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
import { Users, Flag, Settings as SettingsIcon, AlertTriangle, Eye, Mail, MailCheck } from "lucide-react";
import type { UserType } from "@/hooks/use-user-role";
import { GlobalSettingSwitch } from "@/components/GlobalSettingSwitch";
import { API_ENDPOINTS, createApiUrl } from "@/lib/api";

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
    google_alert_rss_url: ''
  });
  const [selectedUserKeywords, setSelectedUserKeywords] = useState<UserKeywords | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [resendingEmails, setResendingEmails] = useState<Set<string>>(new Set());
  const [sendingPasswordReset, setSendingPasswordReset] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Helper function to check if a user can be edited by moderators
  const canEditUser = (userType: UserType) => {
    return userType === 'basic_user' || userType === 'pr_user';
  };

  // Helper function to get badge variant for user types
  const getUserBadgeVariant = (userType: UserType) => {
    switch (userType) {
      case 'admin': return 'destructive';
      case 'moderator': return 'default';
      case 'legal_user': return 'secondary';
      case 'pr_user': return 'outline';
      default: return 'secondary';
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all users with their roles and profiles using new backend API
      const response = await fetch(createApiUrl('/admin/users-with-roles?include_inactive=false'));
      
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
        email_confirmed_at: user.email_confirmed_at
      }));

      // Fetch user keywords using new backend endpoint
      const keywordsResponse = await fetch(createApiUrl('/admin/user-keywords?include_all=true'));
      const keywordsResult = await keywordsResponse.json();
      
      const formattedKeywords: UserKeywords[] = keywordsResult.success ? keywordsResult.data : [];

      // Fetch flagged mentions using new backend endpoint
      const mentionsResponse = await fetch(createApiUrl('/admin/flagged-mentions?flagged=true&limit=50'));
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
      const response = await fetch(createApiUrl(`/admin/user-roles/${userId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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

  const updateUserBrand = async (keywordId: string, brandName: string, variants: string, rssUrl: string) => {
    try {
      const variantsArray = variants.split(',').map(v => v.trim()).filter(v => v);
      
      const { error } = await supabase
        .from("keywords")
        .update({ 
          brand_name: brandName,
          variants: variantsArray,
          google_alert_rss_url: rssUrl || null,
          google_alerts_enabled: rssUrl ? true : false
        })
        .eq("id", keywordId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Brand information updated successfully"
      });
      
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error updating brand:", error);
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

      // Update profile information (upsert to handle cases where profile doesn't exist)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          user_id: userId,
          full_name: profileData.full_name,
          phone_number: profileData.phone_number || null
        }, {
          onConflict: 'user_id'
        });

      if (profileError) throw profileError;

      // Update email if it has changed
      if (profileData.email !== selectedUser?.email && profileData.email.trim()) {
        const { error: emailError } = await supabase
          .rpc('update_user_email_by_moderator', {
            target_user_id: userId,
            new_email: profileData.email.trim()
          });

        if (emailError) throw emailError;
      }

      // Update or create keywords if brand information is provided
      if (profileData.brand_name.trim()) {
        const variantsArray = profileData.variants.split(',').map(v => v.trim()).filter(v => v);
        
        const { error: keywordError } = await supabase
          .from("keywords")
          .upsert({
            user_id: userId,
            brand_name: profileData.brand_name.trim(),
            variants: variantsArray,
            google_alert_rss_url: profileData.google_alert_rss_url.trim() || null
          }, {
            onConflict: 'user_id'
          });

        if (keywordError) throw keywordError;
      }

      toast({
        title: "Profile Updated",
        description: "User profile updated successfully"
      });

      setEditMode(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error updating user profile:", error);
      toast({
        title: "Error",
        description: "Failed to update user profile",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
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

      const response = await fetch(createApiUrl(API_ENDPOINTS.RESEND_EMAIL_CONFIRMATION), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      const response = await fetch(createApiUrl(API_ENDPOINTS.SEND_PASSWORD_RESET), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset email');
      }

      if (data.success) {
        toast({
          title: "Password Reset Sent",
          description: `Password reset email sent to ${email}. The user can now set a new password without entering their old one.`
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading moderator panel...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Moderator Panel</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage users, monitor flagged mentions, and configure brand settings
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" className="w-full sm:w-auto">
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        {/* Mobile tabs - single column */}
        <TabsList className="grid w-full grid-cols-1 gap-2 h-auto md:hidden">
          <TabsTrigger value="users" className="flex items-center gap-2 justify-start">
            <Users className="h-4 w-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="mentions" className="flex items-center gap-2 justify-start">
            <Flag className="h-4 w-4" />
            Flagged Mentions ({flaggedMentions.length})
          </TabsTrigger>
          <TabsTrigger value="brands" className="flex items-center gap-2 justify-start">
            <SettingsIcon className="h-4 w-4" />
            Brand Management ({userKeywords.length})
          </TabsTrigger>
        </TabsList>
        
        {/* Desktop tabs - horizontal layout */}
        <TabsList className="hidden md:grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="mentions" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Flagged Mentions ({flaggedMentions.length})
          </TabsTrigger>
          <TabsTrigger value="brands" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Brand Management ({userKeywords.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage user roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Desktop table view */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Name</TableHead>
                      <TableHead>Email Status</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Fetch Frequency</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                         <TableCell>
                           {canEditUser(user.user_type) ? (
                             <Button
                               variant="link"
                               className="p-0 h-auto font-medium"
                               onClick={() => {
                                 setSelectedUser(user);
                                 const userKeyword = userKeywords.find(k => k.user_id === user.id);
                                 setSelectedUserKeywords(userKeyword || null);
                                 setEditingProfile({
                                   full_name: user.full_name,
                                   email: user.email,
                                   phone_number: user.phone_number || '',
                                   brand_name: userKeyword?.brand_name || '',
                                   variants: userKeyword?.variants?.join(', ') || '',
                                   google_alert_rss_url: userKeyword?.google_alert_rss_url || ''
                                 });
                                 setEditMode(false);
                                 setUserDetailOpen(true);
                               }}
                             >
                               {user.full_name}
                             </Button>
                           ) : (
                             <span className="font-medium text-muted-foreground cursor-not-allowed" title="Cannot edit moderators or admins">
                               {user.full_name}
                             </span>
                           )}
                         </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2">
                                {user.email_confirmed ? (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <MailCheck className="h-4 w-4" />
                                    <span className="text-sm">Confirmed</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-orange-600">
                                    <Mail className="h-4 w-4" />
                                    <span className="text-sm">Unconfirmed</span>
                                  </div>
                                )}
                                <div className="flex gap-1">
                                  {!user.email_confirmed && user.email !== 'Email not available' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => resendEmailConfirmation(user.id, user.email)}
                                      disabled={resendingEmails.has(user.id)}
                                      className="h-7 px-2 text-xs"
                                    >
                                      {resendingEmails.has(user.id) ? 'Sending...' : 'Resend'}
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => sendPasswordReset(user.id, user.email)}
                                    disabled={sendingPasswordReset.has(user.id)}
                                    className="h-7 px-2 text-xs"
                                  >
                                    {sendingPasswordReset.has(user.id) ? 'Sending...' : 'Reset Password'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getUserBadgeVariant(user.user_type)}>
                              {user.user_type.replace('_', ' ')}
                            </Badge>
                            {!canEditUser(user.user_type) && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (Protected)
                              </span>
                            )}
                          </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                         <TableCell>
                           <div className="flex items-center gap-2">
                             <Select 
                               value={user.fetch_frequency_minutes.toString()} 
                               onValueChange={(value: string) => updateUserFetchFrequency(user.id, parseInt(value))}
                               disabled={!canEditUser(user.user_type)}
                             >
                               <SelectTrigger className="w-24">
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="5">5min</SelectItem>
                                 <SelectItem value="10">10min</SelectItem>
                                 <SelectItem value="15">15min</SelectItem>
                                 <SelectItem value="30">30min</SelectItem>
                                 <SelectItem value="60">1hr</SelectItem>
                                 <SelectItem value="120">2hr</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>
                         </TableCell>
                         <TableCell>
                           <Select 
                             value={user.user_type} 
                             onValueChange={(value: UserType) => updateUserRole(user.id, value)}
                             disabled={!canEditUser(user.user_type)}
                           >
                             <SelectTrigger className="w-32">
                               <SelectValue />
                             </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="basic_user">Basic User</SelectItem>
                                <SelectItem value="pr_user">PR User</SelectItem>
                                <SelectItem value="legal_user">Legal User</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                              </SelectContent>
                           </Select>
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card view */}
              <div className="md:hidden space-y-4">
                {users.map((user) => (
                  <Card key={user.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          {canEditUser(user.user_type) ? (
                            <Button
                              variant="link"
                              className="p-0 h-auto font-medium text-left"
                              onClick={() => {
                                setSelectedUser(user);
                                const userKeyword = userKeywords.find(k => k.user_id === user.id);
                                setSelectedUserKeywords(userKeyword || null);
                                setEditingProfile({
                                  full_name: user.full_name,
                                  email: user.email,
                                  phone_number: user.phone_number || '',
                                  brand_name: userKeyword?.brand_name || '',
                                  variants: userKeyword?.variants?.join(', ') || '',
                                  google_alert_rss_url: userKeyword?.google_alert_rss_url || ''
                                });
                                setEditMode(false);
                                setUserDetailOpen(true);
                              }}
                            >
                              {user.full_name}
                            </Button>
                          ) : (
                            <span className="font-medium text-muted-foreground" title="Cannot edit moderators or admins">
                              {user.full_name}
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            <Badge variant={getUserBadgeVariant(user.user_type)} className="text-xs">
                              {user.user_type.replace('_', ' ')}
                            </Badge>
                            {!canEditUser(user.user_type) && (
                              <span className="text-xs text-muted-foreground">
                                (Protected)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              {user.email_confirmed ? (
                                <div className="flex items-center gap-1 text-green-600">
                                  <MailCheck className="h-3 w-3" />
                                  <span className="text-xs">Email Confirmed</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-orange-600">
                                  <Mail className="h-3 w-3" />
                                  <span className="text-xs">Email Unconfirmed</span>
                                </div>
                              )}
                              <div className="flex gap-1">
                                {!user.email_confirmed && user.email !== 'Email not available' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => resendEmailConfirmation(user.id, user.email)}
                                    disabled={resendingEmails.has(user.id)}
                                    className="h-6 px-2 text-xs"
                                  >
                                    {resendingEmails.has(user.id) ? 'Sending...' : 'Resend'}
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => sendPasswordReset(user.id, user.email)}
                                  disabled={sendingPasswordReset.has(user.id)}
                                  className="h-6 px-2 text-xs"
                                >
                                  {sendingPasswordReset.has(user.id) ? 'Sending...' : 'Reset Password'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Fetch Frequency
                          </label>
                          <Select 
                            value={user.fetch_frequency_minutes.toString()} 
                            onValueChange={(value: string) => updateUserFetchFrequency(user.id, parseInt(value))}
                            disabled={!canEditUser(user.user_type)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5 minutes</SelectItem>
                              <SelectItem value="10">10 minutes</SelectItem>
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                              <SelectItem value="120">2 hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Role
                          </label>
                          <Select 
                            value={user.user_type} 
                            onValueChange={(value: UserType) => updateUserRole(user.id, value)}
                            disabled={!canEditUser(user.user_type)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basic_user">Basic User</SelectItem>
                              <SelectItem value="pr_user">PR User</SelectItem>
                              <SelectItem value="legal_user">Legal User</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
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

        <TabsContent value="brands" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Settings</CardTitle>
              <CardDescription>
                Configure global application settings that affect all users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Allow users to change brand names</Label>
                    <p className="text-sm text-muted-foreground">
                      When disabled, basic users cannot modify their brand names or variants
                    </p>
                  </div>
                  <GlobalSettingSwitch 
                    settingKey="usersCanChangeBrandName"
                    onUpdate={fetchData}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Brand Management</CardTitle>
              <CardDescription>
                Manage user brand configurations and Google Alert integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userKeywords.map((keyword) => (
                  <BrandEditor 
                    key={keyword.id} 
                    keyword={keyword} 
                    onUpdate={updateUserBrand} 
                  />
                ))}
                {userKeywords.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No brand configurations found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Details Dialog */}
      <Dialog open={userDetailOpen} onOpenChange={setUserDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editMode ? 'Edit User Profile' : 'User Details'}
            </DialogTitle>
            <DialogDescription>
              {editMode 
                ? `Edit profile information for ${selectedUser?.full_name}`
                : `Detailed information for ${selectedUser?.full_name}`
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
                        <div>
                          <Label className="text-sm font-medium">Google Alert RSS URL</Label>
                          <p className="text-sm text-muted-foreground break-all">
                            {selectedUserKeywords.google_alert_rss_url || 'Not configured'}
                          </p>
                        </div>
                      </>
                    )}
                    <div>
                      <Label className="text-sm font-medium">Member Since</Label>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedUser.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                   <div className="flex flex-col sm:flex-row justify-end gap-2">
                     <Button variant="outline" onClick={() => setUserDetailOpen(false)} className="w-full sm:w-auto">
                       Close
                     </Button>
                     {canEditUser(selectedUser.user_type) && (
                       <Button onClick={() => setEditMode(true)} className="w-full sm:w-auto">
                         Edit Profile
                       </Button>
                     )}
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
                      <Label htmlFor="edit-rss">Google Alert RSS URL</Label>
                      <Textarea
                        id="edit-rss"
                        value={editingProfile.google_alert_rss_url}
                        onChange={(e) => setEditingProfile(prev => ({ ...prev, google_alert_rss_url: e.target.value }))}
                        placeholder="https://www.google.com/alerts/feeds/..."
                        rows={3}
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
                          google_alert_rss_url: selectedUserKeywords?.google_alert_rss_url || ''
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
    </div>
  );
}

interface BrandEditorProps {
  keyword: UserKeywords;
  onUpdate: (keywordId: string, brandName: string, variants: string, rssUrl: string) => void;
}

function BrandEditor({ keyword, onUpdate }: BrandEditorProps) {
  const [brandName, setBrandName] = useState(keyword.brand_name);
  const [variants, setVariants] = useState(keyword.variants?.join(', ') || '');
  const [rssUrl, setRssUrl] = useState(keyword.google_alert_rss_url || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdate(keyword.id, brandName, variants, rssUrl);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setBrandName(keyword.brand_name);
    setVariants(keyword.variants?.join(', ') || '');
    setRssUrl(keyword.google_alert_rss_url || '');
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
          <div>
            <Label htmlFor={`rss-${keyword.id}`}>Google Alert RSS URL</Label>
            <Textarea
              id={`rss-${keyword.id}`}
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              placeholder="https://www.google.com/alerts/feeds/..."
              rows={3}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
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
      )}
    </div>
  );
}