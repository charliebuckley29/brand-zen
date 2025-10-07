import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Loader2, Shield, ArrowRight } from "lucide-react";

/**
 * EmergencySignin Component
 * 
 * This component handles users who click on password reset links from emails.
 * It automatically signs them in and shows an emergency popup directing them
 * to change their password in settings.
 */
export function EmergencySignin() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get URL parameters from Supabase auth callback
  // Prioritize query parameters (?) over hash fragments (#)
  const accessToken = searchParams.get('access_token') || new URLSearchParams(window.location.hash.substring(1)).get('access_token');
  const refreshToken = searchParams.get('refresh_token') || new URLSearchParams(window.location.hash.substring(1)).get('refresh_token');
  const type = searchParams.get('type') || new URLSearchParams(window.location.hash.substring(1)).get('type');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log("🔧 [EMERGENCY_SIGNIN] Starting auth callback with params:", {
          accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null,
          refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : null,
          type,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        });

        // Check if this is a password recovery callback
        if (type === 'recovery') {
          console.log("🔧 [EMERGENCY_SIGNIN] Processing password recovery callback");
          
          // Set the session using the tokens from the URL
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken || '',
            refresh_token: refreshToken || ''
          });

          if (sessionError) {
            console.error("❌ [EMERGENCY_SIGNIN] Session error:", sessionError);
            throw new Error(`Authentication failed: ${sessionError.message}`);
          }

          console.log("✅ [EMERGENCY_SIGNIN] Session set successfully");

          // Verify the user is now authenticated
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) {
            console.error("❌ [EMERGENCY_SIGNIN] User verification failed:", userError);
            throw new Error("Failed to authenticate user");
          }

          console.log("✅ [EMERGENCY_SIGNIN] User authenticated successfully:", {
            id: user.id,
            email: user.email,
            emailConfirmed: user.email_confirmed_at
          });

          // If email was not previously confirmed, this password reset acts as email confirmation
          if (!user.email_confirmed_at) {
            console.log("🔧 [EMERGENCY_SIGNIN] Email was unconfirmed, password reset acts as confirmation");
          }

          setIsSuccess(true);
          
          // Show success toast
          toast({
            title: "Emergency Access Granted",
            description: "You've been signed in via password reset. Please change your password now.",
            variant: "default"
          });

          // Auto-redirect to settings after a short delay
          setTimeout(() => {
            navigate("/?tab=security&emergency=true");
          }, 3000);

        } else {
          console.log("🔧 [EMERGENCY_SIGNIN] Not a recovery callback, type:", type);
          // Not a recovery callback, redirect to home
          navigate("/");
        }
      } catch (error: any) {
        console.error("❌ [EMERGENCY_SIGNIN] Error:", error);
        setError(error.message || "Authentication failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    console.log("🔧 [EMERGENCY_SIGNIN] useEffect triggered with:", {
      accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null,
      refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : null,
      type,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      currentUrl: window.location.href,
      hash: window.location.hash,
      search: window.location.search
    });

    if (accessToken && refreshToken) {
      handleAuthCallback();
    } else {
      console.log("🔧 [EMERGENCY_SIGNIN] No auth tokens found, redirecting to home");
      // No auth tokens, redirect to home
      navigate("/");
    }
  }, [accessToken, refreshToken, type, navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Processing emergency signin...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center space-x-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <span>Authentication Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate("/")} 
              className="w-full"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center space-x-2">
              <Shield className="h-6 w-6 text-green-600" />
              <span>Emergency Access Granted</span>
            </CardTitle>
            <CardDescription>
              You've been signed in via password reset link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> For your security, please change your password immediately in Settings.
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col space-y-2">
              <Button 
                onClick={() => navigate("/?tab=security&emergency=true")} 
                className="w-full"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Go to Settings
              </Button>
              
              <Button 
                onClick={() => navigate("/")} 
                variant="outline" 
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              You'll be automatically redirected to Settings in a few seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
