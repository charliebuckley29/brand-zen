import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SocialMediaLinks } from "@/components/SocialMediaLinks";

interface UserKeywords {
  id: string;
  user_id: string;
  brand_name: string;
  variants: string[] | null;
  google_alert_rss_url: string | null;
  google_alerts_enabled: boolean;
  user_full_name: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  brand_website?: string | null;
  brand_description?: string | null;
  social_media_links?: Record<string, string>;
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
              <Button size="sm" onClick={handleSave} className="w-full sm:w-auto">
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="brandName">Brand Name</Label>
            <Input
              id="brandName"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Enter brand name"
            />
          </div>

          <div>
            <Label htmlFor="variants">Variants (comma-separated)</Label>
            <Input
              id="variants"
              value={variants}
              onChange={(e) => setVariants(e.target.value)}
              placeholder="variant1, variant2, variant3"
            />
          </div>

          <div>
            <Label htmlFor="rssUrl">Google Alerts RSS URL</Label>
            <Input
              id="rssUrl"
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              placeholder="https://www.google.com/alerts/feeds/..."
              className={rssUrl && !validateRssUrl(rssUrl) ? "border-red-500" : ""}
            />
            {rssUrl && !validateRssUrl(rssUrl) && (
              <p className="text-sm text-red-500 mt-1">
                ⚠️ Please enter a valid Google Alerts RSS URL (should contain "google.com" or "google.co.uk" and "/alerts/feeds/")
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="brandWebsite">Brand Website</Label>
            <Input
              id="brandWebsite"
              value={brandWebsite}
              onChange={(e) => setBrandWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <Label htmlFor="brandDescription">Brand Description</Label>
            <Textarea
              id="brandDescription"
              value={brandDescription}
              onChange={(e) => setBrandDescription(e.target.value)}
              placeholder="Brief description of the brand"
              rows={3}
            />
          </div>

          <div>
            <Label>Social Media Links</Label>
            <SocialMediaLinks
              value={socialMediaLinks}
              onChange={setSocialMediaLinks}
              showLabels={true}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Brand Name: </span>
            <span>{keyword.brand_name}</span>
          </div>
          <div>
            <span className="font-medium">Variants: </span>
            <span>{keyword.variants?.join(', ') || 'None'}</span>
          </div>
          <div>
            <span className="font-medium">RSS URL: </span>
            <span className={keyword.google_alert_rss_url ? "text-green-600" : "text-gray-500"}>
              {keyword.google_alert_rss_url || 'Not configured'}
            </span>
          </div>
          <div>
            <span className="font-medium">Website: </span>
            <span>{user?.brand_website || 'Not set'}</span>
          </div>
          <div>
            <span className="font-medium">Description: </span>
            <span>{user?.brand_description || 'Not set'}</span>
          </div>
          {user?.social_media_links && Object.keys(user.social_media_links).length > 0 && (
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
    </div>
  );
}

