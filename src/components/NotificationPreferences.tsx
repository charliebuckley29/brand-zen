import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MessageSquare, Phone, Save, Bell } from "lucide-react";

interface NotificationPreferences {
  email?: boolean;
  sms?: boolean;
  whatsapp?: boolean;
}

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: false,
    sms: false,
    whatsapp: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading preferences:', error);
        return;
      }

      const prefs = (profile?.notification_preferences as NotificationPreferences) || {};
      setPreferences({
        email: prefs.email || false,
        sms: prefs.sms || false,
        whatsapp: prefs.whatsapp || false
      });
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save preferences",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          notification_preferences: preferences,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to save preferences: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Loading your notification settings...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
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
          Choose how you want to be notified about negative sentiment mentions. 
          You'll receive both in-app toast notifications and external notifications (email, SMS, WhatsApp) for mentions with negative sentiment (0-49 score).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive detailed email alerts for negative mentions
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={preferences.email}
              onCheckedChange={(checked) => handlePreferenceChange('email', checked)}
            />
          </div>

          {/* SMS Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-notifications" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                SMS Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Get SMS alerts for urgent negative mentions
              </p>
            </div>
            <Switch
              id="sms-notifications"
              checked={preferences.sms}
              onCheckedChange={(checked) => handlePreferenceChange('sms', checked)}
            />
          </div>

          {/* WhatsApp Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="whatsapp-notifications" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                WhatsApp Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive WhatsApp messages for negative mentions
              </p>
            </div>
            <Switch
              id="whatsapp-notifications"
              checked={preferences.whatsapp}
              onCheckedChange={(checked) => handlePreferenceChange('whatsapp', checked)}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <Button 
            onClick={savePreferences} 
            disabled={saving}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Positive/Neutral mentions</strong> (50-100): Silently added to dashboard, no notifications</li>
            <li>• <strong>Negative mentions</strong> (0-49): Show toast notifications + external notifications based on your preferences above</li>
            <li>• <strong>All mentions</strong> are stored in your dashboard regardless of notification preferences</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
