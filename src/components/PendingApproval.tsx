import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Mail, AlertCircle, CheckCircle } from "lucide-react";

interface PendingApprovalProps {
  userStatus: {
    status: string;
    hasRssUrl: boolean;
    profile: any;
    keywords: any[];
  };
}

export function PendingApproval({ userStatus }: PendingApprovalProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const getStatusMessage = () => {
    if (userStatus.status === 'pending_approval') {
      if (userStatus.profile?.user_status === 'pending_approval') {
        return {
          title: "Account Pending Approval",
          description: "Your account is being reviewed by our team. You'll be notified once it's approved.",
          icon: Clock,
          color: "text-yellow-600"
        };
      } else if (userStatus.profile?.user_status === 'approved' && !userStatus.hasRssUrl) {
        return {
          title: "Account Approved - RSS Setup Required",
          description: "Your account has been approved, but your Google RSS URL needs to be configured by a moderator.",
          icon: CheckCircle,
          color: "text-blue-600"
        };
      }
    } else if (userStatus.status === 'rejected') {
      return {
        title: "Account Rejected",
        description: userStatus.profile?.rejection_reason || "Your account application has been rejected. Please contact support for more information.",
        icon: AlertCircle,
        color: "text-red-600"
      };
    } else if (userStatus.status === 'suspended') {
      return {
        title: "Account Suspended",
        description: "Your account has been suspended. Please contact support for more information.",
        icon: AlertCircle,
        color: "text-red-600"
      };
    }

    return {
      title: "Account Status Unknown",
      description: "There was an issue determining your account status. Please contact support.",
      icon: AlertCircle,
      color: "text-gray-600"
    };
  };

  const statusInfo = getStatusMessage();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <StatusIcon className={`h-6 w-6 ${statusInfo.color}`} />
          </div>
          <CardTitle className={`text-2xl ${statusInfo.color}`}>
            {statusInfo.title}
          </CardTitle>
          <CardDescription>
            {statusInfo.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              <strong>What happens next?</strong>
              <ul className="mt-2 space-y-1 text-sm">
                {userStatus.status === 'pending_approval' && userStatus.profile?.user_status === 'pending_approval' && (
                  <>
                    <li>• A moderator will review your account</li>
                    <li>• They will set up your Google RSS URL</li>
                    <li>• You'll receive an email notification when ready</li>
                  </>
                )}
                {userStatus.status === 'pending_approval' && userStatus.profile?.user_status === 'approved' && !userStatus.hasRssUrl && (
                  <>
                    <li>• Your account has been approved</li>
                    <li>• A moderator is setting up your Google RSS URL</li>
                    <li>• You'll be notified when setup is complete</li>
                  </>
                )}
                {(userStatus.status === 'rejected' || userStatus.status === 'suspended') && (
                  <>
                    <li>• Contact support for assistance</li>
                    <li>• Check your email for more details</li>
                  </>
                )}
              </ul>
            </AlertDescription>
          </Alert>
          
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              You cannot access the dashboard until your account is fully approved and configured.
            </p>
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="w-full"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


