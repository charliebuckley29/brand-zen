import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogOut, User, Settings as SettingsIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface SettingsPageProps {
  onSignOut: () => void;
}

export function SettingsPage({ onSignOut }: SettingsPageProps) {
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
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <Separator />
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}