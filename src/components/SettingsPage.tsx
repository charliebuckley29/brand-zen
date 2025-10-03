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
import { startMonitoring } from "@/lib/monitoring";
import { Switch } from "@/components/ui/switch";
import { useSourcePreferences } from "@/hooks/useSourcePreferences";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useUserRole } from "@/hooks/use-user-role";
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
  const [profilePrTeamEmail, setProfilePrTeamEmail] = useState("");
  const [profileLegalTeamEmail, setProfileLegalTeamEmail] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  // Brand information state
  const [brandWebsite, setBrandWebsite] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [socialMediaLinks, setSocialMediaLinks] = useState<Record<string, string>>({});
  const [isUpdatingBrandInfo, setIsUpdatingBrandInfo] = useState(false);
  
  // Brand management state
  const [brandData, setBrandData] = useState<{ id: string; brand_name: string; variants: string[] } | null>(null);
  const [newBrandName, setNewBrandName] = useState("");
  const [newVariants, setNewVariants] = useState<string[]>([]);
  const [currentVariant, setCurrentVariant] = useState("");
  const [isUpdatingBrand, setIsUpdatingBrand] = useState(false);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [variantsDialogOpen, setVariantsDialogOpen] = useState(false);
  // Setup dialog state
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [setupBrandName, setSetupBrandName] = useState("");
  const [setupVariants, setSetupVariants] = useState<string[]>([]);
  const [setupCurrentVariant, setSetupCurrentVariant] = useState("");
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  
  const { toast } = useToast();
  const { userType } = useUserRole();
  const { getSetting, loading: globalSettingsLoading } = useGlobalSettings();
  const { profileData, loading: profileLoading, updateProfile, updateNotificationPreferences } = useProfileCompletion();

  const { loading: prefsLoading, prefs, setPref, setAllForSource } = useSourcePreferences();
  const [googleAlertsEnabled, setGoogleAlertsEnabled] = useState<boolean>(() => (typeof window !== 'undefined' ? localStorage.getItem('google_alerts_enabled') !== 'false' : true));
  
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
    if (tab === 'notifications') {
      setActiveTab('notifications');
    } else {
      setActiveTab('general');
    }
  }, [searchParams]);

  // Handle tab changes and update URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'notifications') {
      setSearchParams({ tab: 'notifications' });
    } else {
      setSearchParams({});
    }
  };

  // Update profile form when profile data changes
  useEffect(() => {
    if (profileData) {
      setProfileFullName(profileData.full_name || "");
      setProfilePhoneNumber(profileData.phone_number || "");
      setProfilePrTeamEmail(profileData.pr_team_email || "");
      setProfileLegalTeamEmail(profileData.legal_team_email || "");
      setBrandWebsite(profileData.brand_website || "");
      setBrandDescription(profileData.brand_description || "");
      setSocialMediaLinks(profileData.social_media_links || {});
    }
  }, [profileData]);
  const fetchBrandData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("keywords")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setBrandData(data);
        setNewBrandName(data.brand_name);
        setNewVariants(data.variants || []);
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
    if (!newBrandName.trim() || !brandData) return;

    setIsUpdatingBrand(true);
    try {
      const { error } = await supabase
        .from("keywords")
        .update({ brand_name: newBrandName.trim() })
        .eq("id", brandData.id);

      if (error) throw error;

      setBrandData({ ...brandData, brand_name: newBrandName.trim() });
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
      const { error } = await supabase
        .from("keywords")
        .update({ variants: newVariants })
        .eq("id", brandData.id);

      if (error) throw error;

      setBrandData({ ...brandData, variants: newVariants });
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
    if (currentVariant.trim() && !newVariants.includes(currentVariant.trim())) {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          brand_website: brandWebsite.trim() || null,
          brand_description: brandDescription.trim() || null,
          social_media_links: Object.keys(socialMediaLinks).length > 0 ? socialMediaLinks : {}
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Brand information updated",
        description: "Your brand information has been successfully updated.",
      });
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

  // Setup dialog helpers
  const addSetupVariant = () => {
    if (setupCurrentVariant.trim() && !setupVariants.includes(setupCurrentVariant.trim())) {
      setSetupVariants([...setupVariants, setupCurrentVariant.trim()]);
      setSetupCurrentVariant("");
    }
  };

  const removeSetupVariant = (index: number) => {
    setSetupVariants(setupVariants.filter((_, i) => i !== index));
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupBrandName.trim()) return;
    setIsCreatingBrand(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Remove any previous brand for this user before creating a new one
      const { error: deleteError } = await supabase
        .from("keywords")
        .delete()
        .eq("user_id", user.id);
      if (deleteError) throw deleteError;

      const { data: keyword, error: insertError } = await supabase
        .from("keywords")
        .insert({
          user_id: user.id,
          brand_name: setupBrandName.trim(),
          variants: setupVariants,
        })
        .select()
        .maybeSingle();

      if (insertError) throw insertError;

      if (keyword) {
        setBrandData(keyword as any);
        setNewBrandName(keyword.brand_name as string);
        setNewVariants((keyword.variants as string[]) || []);
        setSetupDialogOpen(false);
        try {
          await startMonitoring(keyword.id as string);
        } catch (err) {
          console.error("Failed to start monitoring:", err);
        }
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
    if (!profileFullName.trim()) {
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

    // Validate email formats if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (profilePrTeamEmail && !emailRegex.test(profilePrTeamEmail.trim())) {
      toast({
        title: "Invalid PR team email",
        description: "Please enter a valid email address for the PR team.",
        variant: "destructive",
      });
      return;
    }

    if (profileLegalTeamEmail && !emailRegex.test(profileLegalTeamEmail.trim())) {
      toast({
        title: "Invalid legal team email", 
        description: "Please enter a valid email address for the legal team.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const result = await updateProfile(profileFullName, profilePhoneNumber, profilePrTeamEmail, profileLegalTeamEmail);
      
      if (result.success) {
        setProfileDialogOpen(false);
        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated.",
        });
      } else {
        throw new Error("Failed to update profile");
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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

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

                 <div className="flex items-center justify-between">
                   <div>
                     <h4 className="text-sm font-medium">PR Team Email</h4>
                     <p className="text-sm text-muted-foreground">
                       {profileData?.pr_team_email || "Not set"}
                     </p>
                   </div>
                 </div>

                 <div className="flex items-center justify-between">
                   <div>
                     <h4 className="text-sm font-medium">Legal Team Email</h4>
                     <p className="text-sm text-muted-foreground">
                       {profileData?.legal_team_email || "Not set"}
                     </p>
                   </div>
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
                         <div className="space-y-2">
                           <Label htmlFor="prTeamEmail">PR Team Email</Label>
                           <Input
                             id="prTeamEmail"
                             type="email"
                             placeholder="Enter PR team email (optional)"
                             value={profilePrTeamEmail}
                             onChange={(e) => setProfilePrTeamEmail(e.target.value)}
                           />
                           <p className="text-xs text-muted-foreground">
                             Email address to notify when mentions are escalated to PR team
                           </p>
                         </div>
                         <div className="space-y-2">
                           <Label htmlFor="legalTeamEmail">Legal Team Email</Label>
                           <Input
                             id="legalTeamEmail"
                             type="email"
                             placeholder="Enter legal team email (optional)"
                             value={profileLegalTeamEmail}
                             onChange={(e) => setProfileLegalTeamEmail(e.target.value)}
                           />
                           <p className="text-xs text-muted-foreground">
                             Email address to notify when mentions are escalated to legal team
                           </p>
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
                               setProfilePrTeamEmail(profileData?.pr_team_email || "");
                               setProfileLegalTeamEmail(profileData?.legal_team_email || "");
                             }}
                           >
                             Cancel
                           </Button>
                          <Button 
                            type="submit" 
                            disabled={isUpdatingProfile || !profileFullName.trim()}
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

        {/* Brand Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Brand Management
            </CardTitle>
            <CardDescription>
              Manage your brand name and monitoring variants
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
                    <p className="text-sm text-muted-foreground">{brandData.brand_name}</p>
                  </div>
                  <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={!canChangeBrandName}
                        className={!canChangeBrandName ? "opacity-50 cursor-not-allowed" : ""}
                      >
                        Edit Brand
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
                            disabled={isUpdatingBrand || !newBrandName.trim()}
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
                      {brandData.variants && brandData.variants.length > 0 ? (
                        brandData.variants.map((variant, index) => (
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
                        Edit Variants
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
                              disabled={!currentVariant.trim()}
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
                            disabled={!setupCurrentVariant.trim()}
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
                          disabled={isCreatingBrand || !setupBrandName.trim()}
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


            {/* Google Alerts */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rss className="h-4 w-4" />
                <div>
                  <h4 className="text-sm font-medium">Google Alerts RSS</h4>
                  <p className="text-xs text-muted-foreground">Fetch mentions from Google Alerts RSS feeds</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{googleAlertsEnabled ? 'On' : 'Off'}</span>
                <Switch
                  checked={googleAlertsEnabled}
                  onCheckedChange={(v) => {
                    setGoogleAlertsEnabled(v);
                    try {
                      localStorage.setItem('google_alerts_enabled', v ? 'true' : 'false');
                      toast({ title: v ? 'Google Alerts enabled' : 'Google Alerts disabled' });
                    } catch {}
                  }}
                />
              </div>
            </div>
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
            {/* Brand Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Brand Information
                </CardTitle>
                <CardDescription>
                  Update your brand details including website, description, and social media links
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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

                <div className="flex justify-end">
                  <Button 
                    onClick={handleBrandInfoUpdate}
                    disabled={isUpdatingBrandInfo}
                  >
                    {isUpdatingBrandInfo ? "Updating..." : "Update Brand Information"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Existing Brand Setup */}
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
              <CardContent className="space-y-4">
                {brandData ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Brand Name</p>
                        <p className="text-sm text-muted-foreground">{brandData.brand_name}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBrandDialogOpen(true)}
                      >
                        Edit
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Brand Variants</p>
                        <p className="text-sm text-muted-foreground">
                          {brandData.variants?.length || 0} variants configured
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVariantsDialogOpen(true)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">
                      No brand monitoring setup found. Set up your brand to start monitoring mentions.
                    </p>
                    <Button onClick={() => setSetupDialogOpen(true)}>
                      Set Up Brand Monitoring
                    </Button>
                  </div>
                )}
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