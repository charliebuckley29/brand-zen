import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { SocialMediaLinks } from "@/components/SocialMediaLinks";
import { Edit, Save, X, Building2, Globe, FileText } from "lucide-react";

interface UserBrandInfo {
  brand_name: string;
  variants: string[];
  brand_website: string;
  brand_description: string;
  social_media_links: Record<string, string>;
}

interface UserBrandInfoSectionProps {
  userId: string;
  userFullName: string;
  onUpdate?: () => void;
}

export function UserBrandInfoSection({ userId, userFullName, onUpdate }: UserBrandInfoSectionProps) {
  const [brandInfo, setBrandInfo] = useState<UserBrandInfo>({
    brand_name: '',
    variants: [],
    brand_website: '',
    brand_description: '',
    social_media_links: {}
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    brand_name: '',
    variants: '',
    brand_website: '',
    brand_description: '',
    social_media_links: {} as Record<string, string>
  });

  // Fetch user brand information
  const fetchBrandInfo = async () => {
    try {
      setIsLoading(true);
      console.log('🔧 [BRAND_INFO] Fetching brand info for user:', userId);
      
      // Check authentication first
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔧 [BRAND_INFO] Auth session:', session ? 'exists' : 'none', session?.access_token ? 'token exists' : 'no token');
      
      const response = await apiFetch(`/admin/keywords-management?user_id=${userId}`);
      console.log('🔧 [BRAND_INFO] Response status:', response.status, response.ok);
      const data = await response.json();
      console.log('🔧 [BRAND_INFO] Response data:', data);
      
      if (data.success && data.data && data.data.length > 0) {
        // Get the first keyword record (should be the main brand)
        const mainKeyword = data.data.find((k: any) => k.keyword_type === 'brand_name') || data.data[0];
        
        // Also fetch user profile for additional brand info
        const profileResponse = await apiFetch(`/admin/users-with-roles?user_id=${userId}`);
        const profileData = await profileResponse.json();
        
        let profileInfo = {};
        if (profileData.success && profileData.data && profileData.data.length > 0) {
          const userProfile = profileData.data[0];
          profileInfo = {
            brand_website: userProfile.brand_website || '',
            brand_description: userProfile.brand_description || '',
            social_media_links: userProfile.social_media_links || {}
          };
        }
        
        const brandInfo = {
          brand_name: mainKeyword.keyword_text || '',
          variants: data.data.filter((k: any) => k.keyword_type === 'variant').map((k: any) => k.keyword_text) || [],
          ...profileInfo
        };
        
        setBrandInfo(brandInfo);
        setFormData({
          brand_name: brandInfo.brand_name || '',
          variants: brandInfo.variants?.join(', ') || '',
          brand_website: brandInfo.brand_website || '',
          brand_description: brandInfo.brand_description || '',
          social_media_links: brandInfo.social_media_links || {}
        });
      } else {
        // No keywords found, set empty state
        setBrandInfo({
          brand_name: '',
          variants: [],
          brand_website: '',
          brand_description: '',
          social_media_links: {}
        });
        setFormData({
          brand_name: '',
          variants: '',
          brand_website: '',
          brand_description: '',
          social_media_links: {}
        });
      }
    } catch (error: any) {
      console.error('🔧 [BRAND_INFO] Error fetching brand info:', error);
      console.error('🔧 [BRAND_INFO] Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      toast({
        title: "Error",
        description: error.message || "Failed to fetch brand information",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchBrandInfo();
    }
  }, [userId]);

  // Save brand information
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const variantsArray = (formData.variants || '')
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);

      // Update keywords (brand name and variants)
      const keywordsResponse = await apiFetch('/admin/keywords-management', {
        method: 'PUT',
        body: JSON.stringify({
          user_id: userId,
          brand_name: formData.brand_name,
          variants: variantsArray
        })
      });
      
      const keywordsData = await keywordsResponse.json();
      
      if (!keywordsData.success) {
        throw new Error(keywordsData.error || "Failed to update keywords");
      }

      // Update user profile (website, description, social media)
      const profileResponse = await apiFetch('/admin/update-user-profile', {
        method: 'PUT',
        body: JSON.stringify({
          user_id: userId,
          brand_website: formData.brand_website,
          brand_description: formData.brand_description,
          social_media_links: formData.social_media_links
        })
      });
      
      const profileData = await profileResponse.json();
      
      if (!profileData.success) {
        throw new Error(profileData.error || "Failed to update profile");
      }
      
      toast({
        title: "Success",
        description: "Brand information updated successfully"
      });
      
      // Update local state
      setBrandInfo({
        brand_name: formData.brand_name,
        variants: variantsArray,
        brand_website: formData.brand_website,
        brand_description: formData.brand_description,
        social_media_links: formData.social_media_links
      });
      
      setIsEditing(false);
      onUpdate?.();
    } catch (error: any) {
      console.error('Error saving brand info:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update brand information",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setFormData({
      brand_name: brandInfo.brand_name || '',
      variants: brandInfo.variants?.join(', ') || '',
      brand_website: brandInfo.brand_website || '',
      brand_description: brandInfo.brand_description || '',
      social_media_links: brandInfo.social_media_links || {}
    });
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
            <span className="text-muted-foreground">Loading brand information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Brand Information
            </CardTitle>
            <CardDescription>
              Manage brand name, variants, website, and social media for {userFullName}
            </CardDescription>
          </div>
          {!isEditing && (
            <Button size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-6">
            {/* Brand Name */}
            <div>
              <Label htmlFor="brand-name">Brand Name</Label>
              <Input
                id="brand-name"
                value={formData.brand_name}
                onChange={(e) => setFormData(prev => ({ ...prev, brand_name: e.target.value }))}
                placeholder="Enter the main brand name"
              />
            </div>

            {/* Variants */}
            <div>
              <Label htmlFor="variants">Variants (comma-separated)</Label>
              <Input
                id="variants"
                value={formData.variants}
                onChange={(e) => setFormData(prev => ({ ...prev, variants: e.target.value }))}
                placeholder="variant1, variant2, variant3"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate multiple variants with commas. Each variant will be monitored as a separate keyword.
              </p>
            </div>

            {/* Brand Website */}
            <div>
              <Label htmlFor="brand-website">Brand Website</Label>
              <Input
                id="brand-website"
                type="url"
                value={formData.brand_website}
                onChange={(e) => setFormData(prev => ({ ...prev, brand_website: e.target.value }))}
                placeholder="https://www.example.com"
              />
            </div>

            {/* Brand Description */}
            <div>
              <Label htmlFor="brand-description">Brand Description</Label>
              <Textarea
                id="brand-description"
                value={formData.brand_description}
                onChange={(e) => setFormData(prev => ({ ...prev, brand_description: e.target.value }))}
                placeholder="Tell us about the brand..."
                rows={3}
              />
            </div>

            {/* Social Media Links */}
            <div>
              <Label>Social Media Links</Label>
              <SocialMediaLinks
                value={formData.social_media_links}
                onChange={(links) => setFormData(prev => ({ ...prev, social_media_links: links }))}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Brand Name */}
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium">Brand Name</h4>
                <p className="text-sm text-muted-foreground">
                  {brandInfo.brand_name || 'Not set'}
                </p>
              </div>
            </div>

            {/* Variants */}
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium">Variants</h4>
                <div className="flex flex-wrap gap-2 mt-1">
                  {brandInfo.variants && brandInfo.variants.length > 0 ? (
                    brandInfo.variants.map((variant, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground"
                      >
                        {variant}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No variants set</span>
                  )}
                </div>
              </div>
            </div>

            {/* Brand Website */}
            {brandInfo.brand_website && (
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-medium">Brand Website</h4>
                  <a
                    href={brandInfo.brand_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {brandInfo.brand_website}
                  </a>
                </div>
              </div>
            )}

            {/* Brand Description */}
            {brandInfo.brand_description && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-medium">Brand Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {brandInfo.brand_description}
                  </p>
                </div>
              </div>
            )}

            {/* Social Media Links */}
            {brandInfo.social_media_links && Object.keys(brandInfo.social_media_links).length > 0 && (
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-medium">Social Media Links</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(brandInfo.social_media_links).map(([platform, url]) => (
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
              </div>
            )}

            {/* Empty State */}
            {!brandInfo.brand_name && !brandInfo.brand_website && !brandInfo.brand_description && 
             (!brandInfo.social_media_links || Object.keys(brandInfo.social_media_links).length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No brand information configured</p>
                <p className="text-sm">Click "Edit" to add brand details</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
