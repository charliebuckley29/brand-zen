import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Settings as SettingsIcon, Mail, Lock, Building2, Plus, X, Globe, Newspaper, Youtube, MessageSquare } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startMonitoring } from "@/lib/monitoring";
import { Switch } from "@/components/ui/switch";
import { useSourcePreferences } from "@/hooks/useSourcePreferences";
interface SettingsPageProps {
  onSignOut: () => void;
}

export function SettingsPage({ onSignOut }: SettingsPageProps) {
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  
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

  const { loading: prefsLoading, prefs, setPref, setAllForSource } = useSourcePreferences();

  useEffect(() => {
    fetchBrandData();
  }, []);
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
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Missing information",
        description: "Please fill in all password fields.",
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

      setCurrentPassword("");
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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your account preferences and application settings
        </p>
      </div>

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
                      <Button variant="outline" size="sm">
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
                      <Button variant="outline" size="sm">
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
                                  <X className="h-3 w-3" />
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
                                  <X className="h-3 w-3" />
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
              Choose which sources appear in your Mentions, Analytics and Reports. Data collection is unaffected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Web */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <div>
                  <h4 className="text-sm font-medium">Web</h4>
                  <p className="text-xs text-muted-foreground">General web results</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Enabled</span>
                <Switch
                  checked={(prefs.web?.show_in_mentions !== false) && (prefs.web?.show_in_analytics !== false) && (prefs.web?.show_in_reports !== false)}
                  onCheckedChange={async (v) => {
                    try { await setAllForSource("web", v); } catch (e: any) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
                  }}
                />
              </div>
            </div>

            {/* News */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper className="h-4 w-4" />
                <div>
                  <h4 className="text-sm font-medium">News</h4>
                  <p className="text-xs text-muted-foreground">News articles</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Enabled</span>
                <Switch
                  checked={(prefs.news?.show_in_mentions !== false) && (prefs.news?.show_in_analytics !== false) && (prefs.news?.show_in_reports !== false)}
                  onCheckedChange={async (v) => {
                    try { await setAllForSource("news", v); } catch (e: any) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
                  }}
                />
              </div>
            </div>

            {/* Reddit */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <div>
                  <h4 className="text-sm font-medium">Reddit</h4>
                  <p className="text-xs text-muted-foreground">Reddit posts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Enabled</span>
                <Switch
                  checked={(prefs.reddit?.show_in_mentions !== false) && (prefs.reddit?.show_in_analytics !== false) && (prefs.reddit?.show_in_reports !== false)}
                  onCheckedChange={async (v) => {
                    try { await setAllForSource("reddit", v); } catch (e: any) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
                  }}
                />
              </div>
            </div>

            {/* YouTube */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Youtube className="h-4 w-4" />
                <div>
                  <h4 className="text-sm font-medium">YouTube</h4>
                  <p className="text-xs text-muted-foreground">YouTube videos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Enabled</span>
                <Switch
                  checked={(prefs.youtube?.show_in_mentions !== false) && (prefs.youtube?.show_in_analytics !== false) && (prefs.youtube?.show_in_reports !== false)}
                  onCheckedChange={async (v) => {
                    try { await setAllForSource("youtube", v); } catch (e: any) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
                  }}
                />
              </div>
            </div>
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
                      Enter your current password and choose a new one. Your new password must be at least 6 characters long.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          placeholder="Enter current password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                        />
                      </div>
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
                        disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
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
    </div>
  );
}