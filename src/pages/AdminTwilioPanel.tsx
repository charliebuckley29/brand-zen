import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, ArrowLeft, MessageSquare, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/ui/admin-layout";

type TwilioSettings = {
  id?: string;
  account_sid: string;
  auth_token: string;
  whatsapp_from: string;
  sms_from: string;
  is_active: boolean;
};

export default function AdminTwilioPanel() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [settings, setSettings] = useState<TwilioSettings>({
    account_sid: '',
    auth_token: '',
    whatsapp_from: '',
    sms_from: '',
    is_active: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTokens, setShowTokens] = useState(false);

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      fetchTwilioSettings();
    } else if (!roleLoading && !isAdmin) {
      setLoading(false);
    }
  }, [isAdmin, roleLoading]);

  const fetchTwilioSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_twilio_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching Twilio settings:', error);
      toast.error('Failed to fetch Twilio settings');
    } finally {
      setLoading(false);
    }
  };

  const saveTwilioSettings = async () => {
    try {
      setSaving(true);
      
      const settingsData = {
        account_sid: settings.account_sid,
        auth_token: settings.auth_token,
        whatsapp_from: settings.whatsapp_from,
        sms_from: settings.sms_from,
        is_active: settings.is_active,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('admin_twilio_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('admin_twilio_settings')
          .insert([settingsData])
          .select()
          .single();

        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id }));
      }

      toast.success('Twilio settings saved successfully');
    } catch (error) {
      console.error('Error saving Twilio settings:', error);
      toast.error('Failed to save Twilio settings');
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">
              You need admin privileges to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminLayout
      title="Twilio Configuration"
      description="Configure Twilio settings for SMS and WhatsApp notifications"
    >

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-lg">Twilio Settings</CardTitle>
                  <CardDescription>
                    Configure your Twilio account for sending notifications
                  </CardDescription>
                </div>
              </div>
              <Badge variant={settings.is_active ? 'default' : 'secondary'}>
                {settings.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="account_sid">Account SID</Label>
                <Input
                  id="account_sid"
                  type={showTokens ? 'text' : 'password'}
                  value={settings.account_sid}
                  onChange={(e) => setSettings(prev => ({ ...prev, account_sid: e.target.value }))}
                  placeholder="Enter your Twilio Account SID"
                />
              </div>
              <div>
                <Label htmlFor="auth_token">Auth Token</Label>
                <Input
                  id="auth_token"
                  type={showTokens ? 'text' : 'password'}
                  value={settings.auth_token}
                  onChange={(e) => setSettings(prev => ({ ...prev, auth_token: e.target.value }))}
                  placeholder="Enter your Twilio Auth Token"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-tokens"
                checked={showTokens}
                onCheckedChange={setShowTokens}
              />
              <Label htmlFor="show-tokens">Show credentials</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sms_from">SMS From Number</Label>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="sms_from"
                    value={settings.sms_from}
                    onChange={(e) => setSettings(prev => ({ ...prev, sms_from: e.target.value }))}
                    placeholder="+1234567890"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="whatsapp_from">WhatsApp From Number</Label>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="whatsapp_from"
                    value={settings.whatsapp_from}
                    onChange={(e) => setSettings(prev => ({ ...prev, whatsapp_from: e.target.value }))}
                    placeholder="whatsapp:+14155238886"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="is_active" className="font-medium">Enable Twilio Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Enable SMS and WhatsApp notifications for negative sentiment mentions
                </p>
              </div>
              <Switch
                id="is_active"
                checked={settings.is_active}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={saveTwilioSettings} disabled={saving} className="flex-1">
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">1. Create a Twilio Account</h4>
              <p className="text-sm text-muted-foreground">
                Sign up at <a href="https://www.twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">twilio.com</a> if you don't have an account yet.
              </p>
            </div>
            <div>
              <h4 className="font-medium">2. Get Your Account Credentials</h4>
              <p className="text-sm text-muted-foreground">
                Find your Account SID and Auth Token in the Twilio Console dashboard.
              </p>
            </div>
            <div>
              <h4 className="font-medium">3. Set Up Phone Numbers</h4>
              <p className="text-sm text-muted-foreground">
                Purchase a phone number for SMS and set up WhatsApp Business API for WhatsApp messaging.
              </p>
            </div>
            <div>
              <h4 className="font-medium">4. Test Configuration</h4>
              <p className="text-sm text-muted-foreground">
                Users can enable notifications in their settings page and will receive alerts for negative sentiment mentions.
              </p>
            </div>
          </CardContent>
        </Card>
    </AdminLayout>
  );
}