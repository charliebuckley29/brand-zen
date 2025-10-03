import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Linkedin, 
  Twitter, 
  Facebook, 
  Instagram, 
  Youtube, 
  Music,
  Plus,
  X,
  ExternalLink
} from "lucide-react";
import type { SocialMediaLinks } from "@/types";

interface SocialMediaLinksProps {
  value: SocialMediaLinks;
  onChange: (links: SocialMediaLinks) => void;
  disabled?: boolean;
  showLabels?: boolean;
}

const SOCIAL_PLATFORMS = [
  { 
    key: 'linkedin' as keyof SocialMediaLinks, 
    label: 'LinkedIn', 
    placeholder: 'https://linkedin.com/company/your-company',
    icon: Linkedin,
    color: 'bg-blue-600',
    validation: /^https?:\/\/(www\.)?linkedin\.com\/.+/,
    example: 'https://linkedin.com/company/acme-corp'
  },
  { 
    key: 'twitter' as keyof SocialMediaLinks, 
    label: 'Twitter/X', 
    placeholder: 'https://twitter.com/yourcompany',
    icon: Twitter,
    color: 'bg-black',
    validation: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+/,
    example: 'https://twitter.com/acmecorp'
  },
  { 
    key: 'facebook' as keyof SocialMediaLinks, 
    label: 'Facebook', 
    placeholder: 'https://facebook.com/yourcompany',
    icon: Facebook,
    color: 'bg-blue-700',
    validation: /^https?:\/\/(www\.)?facebook\.com\/.+/,
    example: 'https://facebook.com/acmecorp'
  },
  { 
    key: 'instagram' as keyof SocialMediaLinks, 
    label: 'Instagram', 
    placeholder: 'https://instagram.com/yourcompany',
    icon: Instagram,
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    validation: /^https?:\/\/(www\.)?instagram\.com\/.+/,
    example: 'https://instagram.com/acmecorp'
  },
  { 
    key: 'youtube' as keyof SocialMediaLinks, 
    label: 'YouTube', 
    placeholder: 'https://youtube.com/@yourcompany',
    icon: Youtube,
    color: 'bg-red-600',
    validation: /^https?:\/\/(www\.)?youtube\.com\/.+/,
    example: 'https://youtube.com/@acmecorp'
  },
  { 
    key: 'tiktok' as keyof SocialMediaLinks, 
    label: 'TikTok', 
    placeholder: 'https://tiktok.com/@yourcompany',
    icon: Music,
    color: 'bg-black',
    validation: /^https?:\/\/(www\.)?tiktok\.com\/.+/,
    example: 'https://tiktok.com/@acmecorp'
  },
];

export function SocialMediaLinks({ 
  value, 
  onChange, 
  disabled = false, 
  showLabels = true 
}: SocialMediaLinksProps) {
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<keyof SocialMediaLinks>>(new Set());
  const [errors, setErrors] = useState<Record<keyof SocialMediaLinks, string>>({} as Record<keyof SocialMediaLinks, string>);

  const handleLinkChange = (platform: keyof SocialMediaLinks, url: string) => {
    const newLinks = { ...value, [platform]: url };
    onChange(newLinks);

    // Validate URL
    const platformConfig = SOCIAL_PLATFORMS.find(p => p.key === platform);
    if (url && platformConfig) {
      if (!platformConfig.validation.test(url)) {
        setErrors(prev => ({ ...prev, [platform]: `Please enter a valid ${platformConfig.label} URL` }));
      } else {
        setErrors(prev => ({ ...prev, [platform]: '' }));
      }
    } else {
      setErrors(prev => ({ ...prev, [platform]: '' }));
    }
  };

  const removeLink = (platform: keyof SocialMediaLinks) => {
    const newLinks = { ...value };
    delete newLinks[platform];
    onChange(newLinks);
    setErrors(prev => ({ ...prev, [platform]: '' }));
  };

  const togglePlatform = (platform: keyof SocialMediaLinks) => {
    const newExpanded = new Set(expandedPlatforms);
    if (newExpanded.has(platform)) {
      newExpanded.delete(platform);
    } else {
      newExpanded.add(platform);
    }
    setExpandedPlatforms(newExpanded);
  };

  const hasAnyLinks = Object.values(value).some(link => link && link.trim() !== '');

  if (!showLabels) {
    // Compact view for display purposes
    return (
      <div className="flex flex-wrap gap-2">
        {SOCIAL_PLATFORMS.map(platform => {
          const url = value[platform.key];
          if (!url) return null;
          
          const Icon = platform.icon;
          return (
            <a
              key={platform.key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-white text-xs hover:opacity-80 transition-opacity ${platform.color}`}
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{platform.label}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          );
        })}
        {!hasAnyLinks && (
          <span className="text-sm text-muted-foreground">No social media links</span>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Social Media Links</CardTitle>
        <p className="text-sm text-muted-foreground">
          Add your brand's social media profiles (optional)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {SOCIAL_PLATFORMS.map(platform => {
          const url = value[platform.key] || '';
          const isExpanded = expandedPlatforms.has(platform.key);
          const hasError = errors[platform.key];
          const Icon = platform.icon;

          return (
            <div key={platform.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded ${platform.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <Label className="text-sm font-medium">{platform.label}</Label>
                </div>
                <div className="flex items-center gap-2">
                  {url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLink(platform.key)}
                      disabled={disabled}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePlatform(platform.key)}
                    disabled={disabled}
                    className="h-6 w-6 p-0"
                  >
                    <Plus className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-45' : ''}`} />
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="space-y-2">
                  <Input
                    type="url"
                    placeholder={platform.placeholder}
                    value={url}
                    onChange={(e) => handleLinkChange(platform.key, e.target.value)}
                    disabled={disabled}
                    className={hasError ? 'border-red-500' : ''}
                  />
                  {hasError && (
                    <p className="text-xs text-red-500">{hasError}</p>
                  )}
                  {!hasError && url && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Valid {platform.label} URL
                      </Badge>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Preview
                      </a>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Example: {platform.example}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {hasAnyLinks && (
          <div className="pt-4 border-t">
            <div className="flex flex-wrap gap-2">
              {SOCIAL_PLATFORMS.map(platform => {
                const url = value[platform.key];
                if (!url) return null;
                
                const Icon = platform.icon;
                return (
                  <a
                    key={platform.key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-white text-xs hover:opacity-80 transition-opacity ${platform.color}`}
                  >
                    <Icon className="h-3 w-3" />
                    {platform.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
