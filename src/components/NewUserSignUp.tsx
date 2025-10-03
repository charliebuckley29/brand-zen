import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Loader2, Plus, X, Globe } from "lucide-react";
import { SocialMediaLinks } from "@/components/SocialMediaLinks";
import type { SocialMediaLinks as SocialMediaLinksType } from "@/types";

export function NewUserSignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [brandName, setBrandName] = useState("");
  const [variants, setVariants] = useState<string[]>([]);
  const [newVariant, setNewVariant] = useState("");
  const [brandWebsite, setBrandWebsite] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [socialMediaLinks, setSocialMediaLinks] = useState<SocialMediaLinksType>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const addVariant = () => {
    if (newVariant.trim() && !variants.includes(newVariant.trim())) {
      setVariants([...variants, newVariant.trim()]);
      setNewVariant("");
    }
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter your full name.",
        variant: "destructive",
      });
      return;
    }

    if (!brandName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter your brand name.",
        variant: "destructive",
      });
      return;
    }

    if (!password || password.length < 6) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      toast({
        title: "Invalid password",
        description: "Password must contain uppercase, lowercase, and numbers.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log("🔧 [SIGNUP] Starting user signup via frontend", {
        email,
        fullName: fullName.trim(),
        brandName: brandName.trim(),
        phoneNumber: phoneNumber.trim(),
        brandWebsite: brandWebsite.trim(),
        brandDescription: brandDescription.trim(),
        socialMediaLinks,
        variants
      });

      // Create user directly with Supabase using user-provided password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: password, // User-provided password
        options: {
          data: {
            full_name: fullName.trim(),
            phone_number: phoneNumber?.trim() || null,
            brand_name: brandName.trim(),
            brand_website: brandWebsite?.trim() || null,
            brand_description: brandDescription?.trim() || null,
            social_media_links: Object.keys(socialMediaLinks || {}).length > 0 ? socialMediaLinks : null,
            variants: variants || []
          }
        }
      });

      if (authError) {
        console.error("❌ [SIGNUP] Supabase signup failed", {
          error: authError.message,
          errorCode: authError.status
        });
        throw new Error(authError.message || 'Failed to create account');
      }

      if (!authData.user) {
        throw new Error('No user returned from signup');
      }

      console.log("✅ [SIGNUP] Supabase signup successful", {
        userId: authData.user.id,
        email: authData.user.email,
        emailConfirmed: authData.user.email_confirmed_at
      });

      console.log("🔧 [SIGNUP] Profile and keywords will be created automatically via database triggers", {
        userId: authData.user.id
      });

      setIsSuccess(true);
      toast({
        title: "Account created successfully!",
        description: "Please check your email to confirm your account. Your account is pending approval.",
      });

    } catch (error: any) {
      console.error("❌ [SIGNUP] Signup error", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Account Created!</CardTitle>
            <CardDescription>
              Your account has been successfully created! Please check your email to confirm your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>What happens next?</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Check your email and click the confirmation link</li>
                  <li>• A moderator will review your account</li>
                  <li>• They will set up your Google RSS URL</li>
                  <li>• You'll receive an email notification when your account is ready</li>
                  <li>• You can then sign in using the main sign-in page</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                You cannot sign in until you confirm your email and your account is approved.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">New User Sign-Up</CardTitle>
          <CardDescription>
            Create your account - approval required before access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullname">Full Name</Label>
                <Input
                  id="fullname"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters with uppercase, lowercase, and numbers
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandname">Brand Name</Label>
              <Input
                id="brandname"
                type="text"
                placeholder="Enter your brand name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Brand Variants (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a variant (e.g., product name, slogan)"
                  value={newVariant}
                  onChange={(e) => setNewVariant(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVariant())}
                />
                <Button type="button" onClick={addVariant} size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {variants.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {variants.map((variant, index) => (
                    <div key={index} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md text-sm">
                      <span>{variant}</span>
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandwebsite">Brand Website (Optional)</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="brandwebsite"
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
              <Label htmlFor="branddescription">Brand Description (Optional)</Label>
              <Textarea
                id="branddescription"
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
              <Label>Social Media Links (Optional)</Label>
              <SocialMediaLinks
                value={socialMediaLinks}
                onChange={setSocialMediaLinks}
                showLabels={true}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your account will be created but you cannot sign in until a moderator approves it and sets up your Google RSS URL.
              </AlertDescription>
            </Alert>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
