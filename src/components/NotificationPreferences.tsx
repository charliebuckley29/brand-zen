import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Bell, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";

export function NotificationPreferences() {
  const { toast } = useToast();
  const { profileData, updateNotificationPreferences, loading } = useProfileCompletion();
  
  // Local state for form
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailFrequency, setEmailFrequency] = useState<'immediate' | 'daily' | 'weekly'>('immediate');
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize form state from profile data
  useEffect(() => {
    if (profileData?.notification_preferences?.email) {
      setEmailEnabled(profileData.notification_preferences.email.enabled);
      setEmailFrequency(profileData.notification_preferences.email.frequency);
    } else {
      // Default values if no preferences set
      setEmailEnabled(true); // Default to enabled
      setEmailFrequency('immediate');
    }
  }, [profileData]);

  const handleSavePreferences = async () => {
    setIsUpdating(true);
    try {
      const result = await updateNotificationPreferences({
        email: {
          enabled: emailEnabled,
          frequency: emailFrequency
        }
      });

      if (result.success) {
        toast({
          title: "Notification preferences updated",
          description: "Your email notification settings have been saved successfully.",
        });
      } else {
        throw new Error(result.error?.message || "Failed to update preferences");
      }
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update notification preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Manage how you receive notifications about your brand mentions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading preferences...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Manage how you receive notifications about your brand mentions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-600" />
              <div>
                <Label htmlFor="email-notifications" className="text-base font-medium">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive email alerts for negative sentiment mentions
                </p>
              </div>
            </div>
            <Switch
              id="email-notifications"
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>

          {emailEnabled && (
            <div className="ml-8 space-y-2">
              <Label htmlFor="email-frequency" className="text-sm font-medium">
                Notification Frequency
              </Label>
              <Select value={emailFrequency} onValueChange={(value: 'immediate' | 'daily' | 'weekly') => setEmailFrequency(value)}>
                <SelectTrigger id="email-frequency" className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">
                    <div className="flex flex-col">
                      <span>Immediate</span>
                      <span className="text-xs text-muted-foreground">Get notified as soon as negative mentions are detected</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="daily">
                    <div className="flex flex-col">
                      <span>Daily Digest</span>
                      <span className="text-xs text-muted-foreground">Receive a daily summary of negative mentions</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="weekly">
                    <div className="flex flex-col">
                      <span>Weekly Digest</span>
                      <span className="text-xs text-muted-foreground">Receive a weekly summary of negative mentions</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>


        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSavePreferences}
            disabled={isUpdating}
            className="min-w-[120px]"
          >
            {isUpdating ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
