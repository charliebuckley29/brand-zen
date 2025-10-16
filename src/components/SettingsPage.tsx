import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Settings as SettingsIcon, Mail, Lock, Building2, Plus, X as XIcon, Globe, Youtube, Rss, AlertCircle, TrendingUp, MessageSquare } from "lucide-react";
import { SocialMediaLinks } from "@/components/SocialMediaLinks";
import { SOURCES, type SourceType } from "@/config/sources";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TimezoneSettings } from "@/components/TimezoneSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { useSourcePreferences } from "@/hooks/useSourcePreferences";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useUserRole } from "@/hooks/use-user-role";
import { extractBrandInfo, type StandardizedKeyword } from "@/lib/keywordUtils";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PhoneInputWithCountry } from "@/components/ui/phone-input-with-country";
import { isValidPhoneNumber } from "react-phone-number-input";
import { QuotaDisplay } from "@/components/QuotaDisplay";
import { useQuotaUsage } from "@/hooks/useQuotaUsage";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
interface SettingsPageProps {
  onSignOut: () => void;
}

// Helper function to get the appropriate icon for each source
const getSourceIcon = (sourceType: SourceType) => {
  switch (sourceType) {
    case 'reddit':
      return MessageSquare;
    case 'youtube':
      return Youtube;
    case 'x':
      return XIcon;
    case 'google_alert':
      return Globe;
    default:
      return Globe;
  }
};

export function SettingsPage({ onSignOut }: SettingsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("general");
  
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  
  // Profile management state
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileFullName, setProfileFullName] = useState("");
  const [profilePhoneNumber, setProfilePhoneNumber] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  // Team emails management
  const [teamEmails, setTeamEmails] = useState<string[]>([]);
  const [newTeamEmail, setNewTeamEmail] = useState("");
  const [isUpdatingTeamEmails, setIsUpdatingTeamEmails] = useState(false);
  
  // Brand information state
  const [brandWebsite, setBrandWebsite] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [socialMediaLinks, setSocialMediaLinks] = useState<Record<string, string>>({});
  const [isUpdatingBrandInfo, setIsUpdatingBrandInfo] = useState(false);
  const [isEditingBrandInfo, setIsEditingBrandInfo] = useState(false);
  
  // Brand management state - using standardized keyword format
  const [brandData, setBrandData] = useState<StandardizedKeyword[] | null>(null);
  const [newBrandName, setNewBrandName] = useState<string>("");
  const [newVariants, setNewVariants] = useState<string[]>([]);
  const [currentVariant, setCurrentVariant] = useState<string>("");
  const [isUpdatingBrand, setIsUpdatingBrand] = useState(false);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [variantsDialogOpen, setVariantsDialogOpen] = useState(false);
  // Setup dialog state
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [setupBrandName, setSetupBrandName] = useState<string>("");
  const [setupVariants, setSetupVariants] = useState<string[]>([]);
  const [setupCurrentVariant, setSetupCurrentVariant] = useState<string>("");
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  
  const { toast } = useToast();
  const { userType } = useUserRole();
  const { getSetting, loading: globalSettingsLoading } = useGlobalSettings();
  const { profileData, loading: profileLoading, updateProfile, updateTeamEmails, updateBrandInformation, updateNotificationPreferences } = useProfileCompletion();

  const { loading: prefsLoading, updating: prefsUpdating, prefs, setPref, setAllForSource } = useSourcePreferences();
  
  // Quota management
  const { quotaData, loading: quotaLoading, error: quotaError, refreshQuotaData, getSourcesNearLimit, getSourcesExceeded } = useQuotaUsage();
  
  // Filter quota data to only show YouTube, X, and Reddit
  const allowedSources = ['youtube', 'x', 'reddit'];
  const filteredQuotaData = quotaData.filter(quota => allowedSources.includes(quota.source_type));

  // Check if user can change brand name
  const canChangeBrandName = globalSettingsLoading 
    ? true // Show enabled while loading to prevent flicker
    : getSetting('usersCanChangeBrandName', true);

  useEffect(() => {
    fetchBrandData();
  }, []);

  // Handle URL parameters for tab navigation
  useEffect(() => {
    const tab = searchParams.get('tab');
    const emergency = searchParams.get('emergency');
    
    console.log("🔧 [SETTINGS_PAGE] URL parameters changed:", {
      tab,
      emergency,
      allParams: Object.fromEntries(searchParams.entries())
    });
    
    if (tab === 'notifications') {
      setActiveTab('notifications');
    } else if (tab === 'security') {
      setActiveTab('security');
    } else {
      setActiveTab('general');
    }
  }, [searchParams]);

  // Handle tab changes and update URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'notifications') {
      setSearchParams({ tab: 'notifications' });
    } else if (value === 'security') {
      setSearchParams({ tab: 'security' });
    } else {
      setSearchParams({});
    }
  };

  // Update profile form when profile data changes
  useEffect(() => {
    if (profileData) {
      setProfileFullName(profileData.full_name || "");
      setProfilePhoneNumber(profileData.phone_number || "");
      setBrandWebsite(profileData.brand_website || "");
      setBrandDescription(profileData.brand_description || "");
      setSocialMediaLinks(profileData.social_media_links || {});
      setTeamEmails(profileData.team_emails || []);
    }
  }, [profileData]);
  const fetchBrandData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use the new keywords management API
      const { apiFetch } = await import('@/lib/api');
      const response = await apiFetch(`/admin/keywords-management?user_id=${user.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch keywords');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch keywords');
      }

      // Use standardized keyword format
      if (result.data && result.data.length > 0) {
        setBrandData(result.data);
        const brandInfo = extractBrandInfo(result.data);
        setNewBrandName(brandInfo.brand_name);
        setNewVariants(brandInfo.variants);
      } else {
        setBrandData(null);
        setNewBrandName("");
        setNewVariants([]);
      }
    } catch (error: any) {
      console.error("Error fetching brand data:", error);
    }
  };

  const handleBrandNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName?.trim() || !brandData) return;

    setIsUpdatingBrand(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { apiFetch } = await import('@/lib/api');
      const response = await apiFetch(`/admin/keywords-management`, {
        method: 'PUT',
        body: JSON.stringify({
          user_id: user.id,
          brand_name: newBrandName?.trim() || "",
          variants: newVariants
        })
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Failed to update brand name');
      }

      // Refresh brand data after update
      await fetchBrandData();
      setBrandDialogOpen(false);
      
      toast({
        title: "Brand name updated",
        description: "Your brand name has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating brand name",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingBrand(false);
    }
  };

  const handleVariantsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandData) return;

    setIsUpdatingBrand(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { apiFetch } = await import('@/lib/api');
      const response = await apiFetch(`/admin/keywords-management`, {
        method: 'PUT',
        body: JSON.stringify({
          user_id: user.id,
          brand_name: newBrandName,
          variants: newVariants
        })
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Failed to update variants');
      }

      // Refresh brand data after update
      await fetchBrandData();
      setVariantsDialogOpen(false);
      
      toast({
        title: "Brand variants updated",
        description: "Your brand variants have been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating variants",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingBrand(false);
    }
  };

  const addVariant = () => {
    if (currentVariant?.trim() && !newVariants.includes(currentVariant.trim())) {
      setNewVariants([...newVariants, currentVariant.trim()]);
      setCurrentVariant("");
    }
  };

  const removeVariant = (index: number) => {
    setNewVariants(newVariants.filter((_, i) => i !== index));
  };

  const handleBrandInfoUpdate = async () => {
    setIsUpdatingBrandInfo(true);
    try {
      const result = await updateBrandInformation({
        brand_website: brandWebsite,
        brand_description: brandDescription,
        social_media_links: socialMediaLinks
      });

      if (!result.success) {
        throw new Error(result.error?.message || "Failed to update brand information");
      }

      toast({
        title: "Brand information updated",
        description: "Your brand information has been successfully updated.",
      });
      setIsEditingBrandInfo(false); // Exit edit mode after successful update
    } catch (error: any) {
      toast({
        title: "Error updating brand information",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingBrandInfo(false);
    }
  };

  const handleCancelBrandInfoEdit = () => {
    // Reset to original values from profileData
    setBrandWebsite(profileData?.brand_website || "");
    setBrandDescription(profileData?.brand_description || "");
    setSocialMediaLinks(profileData?.social_media_links || {});
    setIsEditingBrandInfo(false);
  };

  // Team emails management functions
  const addTeamEmail = () => {
    if (newTeamEmail?.trim() && !teamEmails.includes(newTeamEmail.trim())) {
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (emailRegex.test(newTeamEmail.trim())) {
        setTeamEmails([...teamEmails, newTeamEmail.trim()]);
        setNewTeamEmail("");
      } else {
        toast({
          title: "Invalid email format",
          description: "Please enter a valid email address.",
          variant: "destructive"
        });
      }
    }
  };

  const removeTeamEmail = (index: number) => {
    setTeamEmails(teamEmails.filter((_, i) => i !== index));
  };

  const handleTeamEmailsUpdate = async () => {
    if (teamEmails.length > 10) {
      toast({
        title: "Too many emails",
        description: "Maximum 10 team emails allowed.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingTeamEmails(true);
    try {
      const result = await updateTeamEmails(teamEmails);
      if (result.success) {
        toast({
          title: "Team emails updated",
          description: "Your team emails have been successfully updated."
        });
      } else {
        throw result.error;
      }
    } catch (error: any) {
      toast({
        title: "Failed to update team emails",
        description: error.message || "An error occurred while updating team emails.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingTeamEmails(false);
    }
  };

  // Setup dialog helpers
  const addSetupVariant = () => {
    if (setupCurrentVariant?.trim() && !setupVariants.includes(setupCurrentVariant.trim())) {
      setSetupVariants([...setupVariants, setupCurrentVariant.trim()]);
      setSetupCurrentVariant("");
    }
  };

  const removeSetupVariant = (index: number) => {
    setSetupVariants(setupVariants.filter((_, i) => i !== index));
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupBrandName?.trim()) return;
    setIsCreatingBrand(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use the new keywords management API to create/update keywords
      const { apiFetch } = await import('@/lib/api');
      const response = await apiFetch(`/admin/keywords-management`, {
        method: 'PUT',
        body: JSON.stringify({
          user_id: user.id,
          brand_name: setupBrandName?.trim() || "",
          variants: setupVariants,
        })
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Failed to create brand');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create brand');
      }

      const keyword = result.data;

      if (keyword) {
        setBrandData(keyword as any);
        setNewBrandName(keyword.brand_name as string);
        setNewVariants((keyword.variants as string[]) || []);
        setSetupDialogOpen(false);
        // Monitoring is handled automatically by backend queue system
        toast({
          title: "Brand created",
          description: "Your brand is now set up for monitoring.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error creating brand",
        description: error.message ?? "Failed to create brand.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBrand(false);
    }
  };
  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    setIsUpdatingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      toast({
        title: "Email update requested",
        description: "Please check both your old and new email addresses for confirmation links.",
      });

      setNewEmail("");
      setEmailDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error updating email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Missing information",
        description: "Please fill in the new password fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your new passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password updated successfully",
        description: "Your password has been changed.",
      });

      setNewPassword("");
      setConfirmPassword("");
      setPasswordDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error updating password",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileFullName?.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your full name.",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number if provided
    if (profilePhoneNumber && !isValidPhoneNumber(profilePhoneNumber)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number with country code.",
        variant: "destructive",
      });
      return;
    }

    // Validate team emails
    if (teamEmails.length > 10) {
      toast({
        title: "Too many team emails",
        description: "Maximum 10 team emails allowed.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = teamEmails.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      toast({
        title: "Invalid team emails",
        description: "Please ensure all team emails are valid.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingProfile(true);
    try {
      // Update profile and team emails
      const profileResult = await updateProfile(profileFullName, profilePhoneNumber);
      const teamEmailsResult = await updateTeamEmails(teamEmails);
      
      if (profileResult.success && teamEmailsResult.success) {
        setProfileDialogOpen(false);
        toast({
          title: "Profile updated",
          description: "Your profile and team emails have been successfully updated.",
        });
      } else {
        throw new Error("Failed to update profile or team emails");
      }
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your account preferences and application settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
        <div className="block sm:hidden">
          <TabsList className="grid w-full grid-cols-1 gap-1 h-auto p-1">
            <TabsTrigger value="general" className="text-xs px-2 py-1.5 h-auto">
              General
            </TabsTrigger>
            <TabsTrigger value="brand" className="text-xs px-2 py-1.5 h-auto">
              Brand
            </TabsTrigger>
            <TabsTrigger value="sources" className="text-xs px-2 py-1.5 h-auto">
              Sources
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs px-2 py-1.5 h-auto">
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs px-2 py-1.5 h-auto">
              Notifications
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="hidden sm:block">
          <TabsList className="grid w-full grid-cols-5 gap-1 h-auto p-1">
            <TabsTrigger value="general" className="text-sm px-3 py-2 h-auto">
              General
            </TabsTrigger>
            <TabsTrigger value="brand" className="text-sm px-3 py-2 h-auto">
              Brand
            </TabsTrigger>
            <TabsTrigger value="sources" className="text-sm px-3 py-2 h-auto">
              Sources
            </TabsTrigger>
            <TabsTrigger value="security" className="text-sm px-3 py-2 h-auto">
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-sm px-3 py-2 h-auto">
              Notifications
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Theme</h4>
                <p className="text-sm text-muted-foreground">
                  Switch between light and dark mode
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>


        {/* Timezone Settings */}
        <TimezoneSettings />

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Manage your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileLoading ? (
              <div className="text-sm text-muted-foreground">Loading profile...</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Full Name</h4>
                    <p className="text-sm text-muted-foreground">
                      {profileData?.full_name || "Not set"}
                    </p>
                  </div>
                </div>
                
                 <div className="flex items-center justify-between">
                   <div>
                     <h4 className="text-sm font-medium">Phone Number</h4>
                     <p className="text-sm text-muted-foreground">
                       {profileData?.phone_number || "Not set"}
                     </p>
                   </div>
                 </div>

                 <div className="space-y-3">
                   <div>
                     <h4 className="text-sm font-medium">Team Emails</h4>
                     <p className="text-sm text-muted-foreground">
                       {teamEmails.length > 0 
                         ? `${teamEmails.length} team email${teamEmails.length === 1 ? '' : 's'} configured`
                         : "No team emails configured"
                       }
                     </p>
                   </div>
                   {teamEmails.length > 0 && (
                     <div className="space-y-2">
                       {teamEmails.map((email, index) => (
                         <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                           <span className="text-sm">{email}</span>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => removeTeamEmail(index)}
                             className="h-6 w-6 p-0"
                           >
                             <XIcon className="h-3 w-3" />
                           </Button>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>

                <div className="pt-2">
                  <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                        <DialogDescription>
                          Update your personal information and contact details.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleProfileUpdate} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">Full Name *</Label>
                          <Input
                            id="fullName"
                            type="text"
                            placeholder="Enter your full name"
                            value={profileFullName}
                            onChange={(e) => setProfileFullName(e.target.value)}
                            required
                          />
                        </div>
                         <div className="space-y-2">
                           <Label htmlFor="phoneNumber">Phone Number</Label>
                           <PhoneInputWithCountry
                             id="phoneNumber"
                             placeholder="Enter your phone number (optional)"
                             value={profilePhoneNumber}
                             onChange={(value) => setProfilePhoneNumber(value || "")}
                           />
                         </div>
                         <div className="space-y-3">
                           <Label>Team Emails</Label>
                           <p className="text-xs text-muted-foreground">
                             Add email addresses that should be notified when mentions are escalated
                           </p>
                           
                           {/* Add new email input */}
                           <div className="flex gap-2">
                             <Input
                               type="email"
                               placeholder="team@company.com"
                               value={newTeamEmail}
                               onChange={(e) => setNewTeamEmail(e.target.value)}
                               onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTeamEmail())}
                             />
                             <Button
                               type="button"
                               onClick={addTeamEmail}
                               disabled={!newTeamEmail?.trim() || teamEmails.includes(newTeamEmail?.trim() || "")}
                             >
                               Add
                             </Button>
                           </div>
                           
                           {/* Display existing emails */}
                           {teamEmails.length > 0 && (
                             <div className="space-y-2">
                               {teamEmails.map((email, index) => (
                                 <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                                   <span className="text-sm">{email}</span>
                                   <Button
                                     type="button"
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => removeTeamEmail(index)}
                                     className="h-6 w-6 p-0"
                                   >
                                     <XIcon className="h-3 w-3" />
                                   </Button>
                                 </div>
                               ))}
                             </div>
                           )}
                           
                           {teamEmails.length >= 10 && (
                             <p className="text-xs text-muted-foreground">
                               Maximum 10 team emails allowed
                             </p>
                           )}
                         </div>
                        <div className="flex justify-end gap-2">
                           <Button 
                             type="button" 
                             variant="outline" 
                             onClick={() => {
                               setProfileDialogOpen(false);
                               // Reset form to current data
                               setProfileFullName(profileData?.full_name || "");
                               setProfilePhoneNumber(profileData?.phone_number || "");
                             }}
                           >
                             Cancel
                           </Button>
                          <Button 
                            type="submit" 
                            disabled={isUpdatingProfile || !profileFullName?.trim()}
                          >
                            {isUpdatingProfile ? "Updating..." : "Update Profile"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </>
            )}
          </CardContent>
        </Card>


        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>
              Manage your account and security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Update */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <div>
                  <h4 className="text-sm font-medium">Email Address</h4>
                  <p className="text-sm text-muted-foreground">
                    Update your account email address
                  </p>
                </div>
              </div>
              <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Change Email
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Change Email Address</DialogTitle>
                    <DialogDescription>
                      Enter your new email address. You'll need to confirm the change from both your old and new email addresses.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleEmailUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newEmail">New Email Address</Label>
                      <Input
                        id="newEmail"
                        type="email"
                        placeholder="Enter new email address"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setEmailDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isUpdatingEmail || !newEmail}
                      >
                        {isUpdatingEmail ? "Updating..." : "Update Email"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Separator />

            {/* Password Update */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <div>
                  <h4 className="text-sm font-medium">Password</h4>
                  <p className="text-sm text-muted-foreground">
                    Change your account password
                  </p>
                </div>
              </div>
              <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Change Password
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                      Choose a new password. Your new password must be at least 6 characters long.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setPasswordDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                      >
                        {isUpdatingPassword ? "Updating..." : "Update Password"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Separator />

            {/* Sign Out */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-destructive">Sign Out</h4>
                <p className="text-sm text-muted-foreground">
                  Sign out of your account and return to the login page
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={onSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        <TabsContent value="brand" className="space-y-6">
          <div className="grid gap-6">
            {/* Brand Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Brand Monitoring Setup
                </CardTitle>
                <CardDescription>
                  Configure your brand name and variants for mention monitoring
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!canChangeBrandName && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Brand name editing is currently disabled. Please contact support to change your brand name.
                    </AlertDescription>
                  </Alert>
                )}
                {brandData ? (
                  <>
                    {/* Brand Name */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Brand Name</h4>
                        <p className="text-sm text-muted-foreground">
                          {brandData ? extractBrandInfo(brandData).brand_name || 'Not set' : 'Not set'}
                        </p>
                      </div>
                      <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={!canChangeBrandName}
                            className={!canChangeBrandName ? "opacity-50 cursor-not-allowed" : ""}
                          >
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit Brand Name</DialogTitle>
                            <DialogDescription>
                              Update your brand name for monitoring and reports.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleBrandNameUpdate} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="brandName">Brand Name</Label>
                              <Input
                                id="brandName"
                                type="text"
                                placeholder="Enter brand name"
                                value={newBrandName}
                                onChange={(e) => setNewBrandName(e.target.value)}
                                required
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setBrandDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={isUpdatingBrand || !newBrandName?.trim()}
                              >
                                {isUpdatingBrand ? "Updating..." : "Update Brand"}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <Separator />

                    {/* Brand Variants */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">Brand Variants</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {brandData && extractBrandInfo(brandData).variants.length > 0 ? (
                            extractBrandInfo(brandData).variants.map((variant, index) => (
                              <Badge key={index} variant="secondary">
                                {variant}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No variants added</p>
                          )}
                        </div>
                      </div>
                      <Dialog open={variantsDialogOpen} onOpenChange={setVariantsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={!canChangeBrandName}
                            className={!canChangeBrandName ? "opacity-50 cursor-not-allowed" : ""}
                          >
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit Brand Variants</DialogTitle>
                            <DialogDescription>
                              Add alternative names or keywords for your brand monitoring.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleVariantsUpdate} className="space-y-4">
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Add variant"
                                  value={currentVariant}
                                  onChange={(e) => setCurrentVariant(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVariant())}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={addVariant}
                                  disabled={!currentVariant?.trim()}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {newVariants.map((variant, index) => (
                                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                    {variant}
                                     <button
                                       type="button"
                                       onClick={() => removeVariant(index)}
                                       className="ml-1 hover:text-destructive"
                                     >
                                       <XIcon className="h-3 w-3" />
                                     </button>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setVariantsDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={isUpdatingBrand}
                              >
                                {isUpdatingBrand ? "Updating..." : "Update Variants"}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">No brand configured</h4>
                      <p className="text-sm text-muted-foreground">Set up your brand name and variants to start monitoring.</p>
                    </div>
                    <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="default" size="sm">Set up brand</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Set up your brand</DialogTitle>
                          <DialogDescription>Add your brand name and optional variants.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateBrand} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="setupBrandName">Brand Name</Label>
                            <Input
                              id="setupBrandName"
                              type="text"
                              placeholder="Enter brand name"
                              value={setupBrandName}
                              onChange={(e) => setSetupBrandName(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add variant"
                                value={setupCurrentVariant}
                                onChange={(e) => setSetupCurrentVariant(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSetupVariant())}
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={addSetupVariant}
                                disabled={!setupCurrentVariant?.trim()}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            {setupVariants.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {setupVariants.map((variant, index) => (
                                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                    {variant}
                                     <button
                                       type="button"
                                       onClick={() => removeSetupVariant(index)}
                                       className="ml-1 hover:text-destructive"
                                     >
                                       <XIcon className="h-3 w-3" />
                                     </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setSetupDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={isCreatingBrand || !setupBrandName?.trim()}
                            >
                              {isCreatingBrand ? "Setting up..." : "Create Brand"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Brand Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Brand Information
                </CardTitle>
                <CardDescription>
                  View and manage your brand details including website, description, and social media links
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isEditingBrandInfo ? (
                  // Display Mode
                  <div className="space-y-6">
                    {/* Brand Website */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <h4 className="text-sm font-medium">Brand Website</h4>
                          <p className="text-sm text-muted-foreground">
                            {brandWebsite ? (
                              <a 
                                href={brandWebsite} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {brandWebsite}
                              </a>
                            ) : (
                              "Not set"
                            )}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingBrandInfo(true)}
                      >
                        Edit
                      </Button>
                    </div>

                    {/* Brand Description */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium mb-2">Brand Description</h4>
                        <p className="text-sm text-muted-foreground">
                          {brandDescription || "No description provided"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingBrandInfo(true)}
                        className="ml-4"
                      >
                        Edit
                      </Button>
                    </div>

                    {/* Social Media Links */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium mb-2">Social Media Links</h4>
                        <SocialMediaLinks
                          value={socialMediaLinks}
                          onChange={() => {}} // Read-only in display mode
                          showLabels={false}
                          disabled={true}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingBrandInfo(true)}
                        className="ml-4"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Edit Mode
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="brand-website">Brand Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="brand-website"
                          type="url"
                          placeholder="https://yourcompany.com"
                          value={brandWebsite}
                          onChange={(e) => setBrandWebsite(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your company's main website URL
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="brand-description">Brand Description</Label>
                      <Textarea
                        id="brand-description"
                        placeholder="Describe your brand, including products/services offered and your target audience..."
                        value={brandDescription}
                        onChange={(e) => setBrandDescription(e.target.value)}
                        rows={4}
                        maxLength={2000}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Include your products/services and target audience</span>
                        <span>{brandDescription.length}/2000</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Social Media Links</Label>
                      <SocialMediaLinks
                        value={socialMediaLinks}
                        onChange={setSocialMediaLinks}
                        showLabels={true}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline"
                        onClick={handleCancelBrandInfoEdit}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleBrandInfoUpdate}
                        disabled={isUpdatingBrandInfo}
                      >
                        {isUpdatingBrandInfo ? "Updating..." : "Update Brand Information"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          <div className="grid gap-6">
            {/* Sources Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Sources
                </CardTitle>
                <CardDescription>
                  Choose which sources to monitor and collect data from. Disabled sources will not fetch new mentions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(SOURCES).map(([sourceId, sourceConfig]) => {
                  const IconComponent = getSourceIcon(sourceId as SourceType);
                  const isEnabled = (prefs[sourceId as SourceType]?.show_in_mentions !== false) && 
                                   (prefs[sourceId as SourceType]?.show_in_analytics !== false) && 
                                   (prefs[sourceId as SourceType]?.show_in_reports !== false);
                  
                  return (
                    <div key={sourceId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <div>
                          <h4 className="text-sm font-medium">{sourceConfig.name}</h4>
                          <p className="text-xs text-muted-foreground">{sourceConfig.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <Switch
                          checked={isEnabled}
                          disabled={prefsUpdating}
                          onCheckedChange={async (v) => {
                            try { 
                              await setAllForSource(sourceId as SourceType, v); 
                            } catch (e: any) { 
                              toast({ 
                                title: "Update failed", 
                                description: e.message, 
                                variant: "destructive" 
                              }); 
                            }
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

              </CardContent>
            </Card>

            {/* Quota Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  View Fetching Rate Limitations
                </CardTitle>
                <CardDescription>
                  Monitor your monthly usage limits for each data source
                </CardDescription>
              </CardHeader>
              <CardContent>
                {quotaLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-gray-500">Loading quota data...</div>
                  </div>
                ) : quotaError ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Quota Data</AlertTitle>
                    <AlertDescription>
                      {quotaError}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="ml-2"
                        onClick={refreshQuotaData}
                      >
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : filteredQuotaData.length > 0 ? (
                  <div className="space-y-4">
                    {/* Overall Status */}
                    {getSourcesExceeded().filter(s => allowedSources.includes(s.source_type)).length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Quota Exceeded</AlertTitle>
                        <AlertDescription>
                          You've reached your monthly limit for: {getSourcesExceeded().filter(s => allowedSources.includes(s.source_type)).map(s => s.source_type).join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {getSourcesNearLimit().filter(s => allowedSources.includes(s.source_type)).length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Approaching Limits</AlertTitle>
                        <AlertDescription>
                          You're near your monthly limit for: {getSourcesNearLimit().filter(s => allowedSources.includes(s.source_type)).map(s => s.source_type).join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Quota Display */}
                    <QuotaDisplay quotaData={filteredQuotaData} showDetails={true} />
                    
                    {/* Refresh Button */}
                    <div className="flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={refreshQuotaData}
                        disabled={quotaLoading}
                      >
                        Refresh Data
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-sm text-gray-500">No quota data available</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid gap-6">
            {/* Emergency Alert */}
            {searchParams.get('emergency') === 'true' && (
              <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-800 dark:text-orange-200">
                  Emergency Access - Password Reset Required
                </AlertTitle>
                <AlertDescription className="text-orange-700 dark:text-orange-300">
                  You've been signed in via password reset link. For your security, please change your password immediately.
                </AlertDescription>
              </Alert>
            )}

            {/* Password Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Password & Security</span>
                  {searchParams.get('emergency') === 'true' && (
                    <Badge variant="destructive" className="ml-2">
                      Action Required
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Manage your account password and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Lock className="h-4 w-4" />
                    <div>
                      <h4 className="text-sm font-medium">Password</h4>
                      <p className="text-sm text-muted-foreground">
                        Change your account password
                      </p>
                    </div>
                  </div>
                  <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant={searchParams.get('emergency') === 'true' ? 'default' : 'outline'} 
                        size="sm"
                        className={searchParams.get('emergency') === 'true' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                      >
                        {searchParams.get('emergency') === 'true' ? 'Reset Password Now' : 'Change Password'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          {searchParams.get('emergency') === 'true' ? 'Reset Your Password' : 'Change Password'}
                        </DialogTitle>
                        <DialogDescription>
                          {searchParams.get('emergency') === 'true' 
                            ? 'Please set a new secure password for your account.' 
                            : 'Choose a new password. Your new password must be at least 6 characters long.'
                          }
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handlePasswordUpdate} className="space-y-4">
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Enter new password"
                              required
                              disabled={isUpdatingPassword}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm new password"
                              required
                              disabled={isUpdatingPassword}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setPasswordDialogOpen(false);
                              setNewPassword("");
                              setConfirmPassword("");
                            }}
                            disabled={isUpdatingPassword}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isUpdatingPassword}>
                            {isUpdatingPassword ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              'Update Password'
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Email Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Email Address</span>
                </CardTitle>
                <CardDescription>
                  Manage your account email address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4" />
                    <div>
                      <h4 className="text-sm font-medium">Email Address</h4>
                      <p className="text-sm text-muted-foreground">
                        Current: {profileData?.email || 'Loading...'}
                      </p>
                    </div>
                  </div>
                  <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Change Email
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Change Email Address</DialogTitle>
                        <DialogDescription>
                          Enter your new email address. You'll need to verify it before the change takes effect.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleEmailUpdate} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="newEmail">New Email Address</Label>
                          <Input
                            id="newEmail"
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="Enter new email address"
                            required
                            disabled={isUpdatingEmail}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEmailDialogOpen(false);
                              setNewEmail("");
                            }}
                            disabled={isUpdatingEmail}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={isUpdatingEmail}>
                            {isUpdatingEmail ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              'Update Email'
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationPreferences />
        </TabsContent>
      </Tabs>
    </div>
  );
}