import { useState, useEffect } from "react";
import { MainDashboard } from "@/components/MainDashboard";
import { Auth } from "@/components/Auth";
import { ProfileCompletion } from "@/components/ProfileCompletion";
import { PendingApproval } from "@/components/PendingApproval";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useNotifications } from "@/contexts/NotificationContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { NavigationProvider } from "@/contexts/NavigationContext";

const Index = () => {
  return (
    <NotificationProvider>
      <NavigationProvider>
        <IndexContent />
      </NavigationProvider>
    </NotificationProvider>
  );
};

const IndexContent = () => {
  const [user, setUser] = useState<any>(null);
  const [hasKeywords, setHasKeywords] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profileData, isProfileComplete, loading: profileLoading, updateProfile, refreshProfile } = useProfileCompletion();
  const { status: userStatus, hasRssUrl, profile, keywords } = useUserStatus();
  const { unreadCount } = useNotifications();

  useEffect(() => {
    // Check authentication status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkKeywords();
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkKeywords();
      } else {
        setHasKeywords(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkKeywords = async () => {
    try {
      const { data, error } = await supabase
        .from("keywords")
        .select("id")
        .limit(1);

      if (error) throw error;

      setHasKeywords(data && data.length > 0);
    } catch (error) {
      console.error("Error checking keywords:", error);
      setHasKeywords(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (isLoading || profileLoading || userStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication if not logged in
  if (!user) {
    return <Auth />;
  }

  // Show pending approval if user status is not approved or doesn't have RSS URL
  if (user && (userStatus === 'pending_approval' || userStatus === 'rejected' || userStatus === 'suspended' || userStatus === 'error')) {
    return (
      <PendingApproval 
        userStatus={{
          status: userStatus,
          hasRssUrl,
          profile,
          keywords: keywords || []
        }}
      />
    );
  }

  // Show profile completion if profile is incomplete
  if (user && isProfileComplete === false) {
    return (
      <ProfileCompletion
        initialData={profileData}
        onComplete={updateProfile}
        onCancel={() => {
          // Allow user to skip profile completion for now
          // They can complete it later in settings
          refreshProfile();
        }}
      />
    );
  }

  // Show dashboard (MainDashboard handles brand setup if no keywords)
  return (
    <MainDashboard 
      onSignOut={handleSignOut}
      hasKeywords={hasKeywords || false}
      onKeywordsUpdated={() => setHasKeywords(true)}
      unreadCount={unreadCount}
    />
  );

};

export default Index;