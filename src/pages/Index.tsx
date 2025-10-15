import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainDashboard } from "@/components/MainDashboard";
import { Auth } from "@/components/Auth";
import { ProfileCompletion } from "@/components/ProfileCompletion";
import { PendingApproval } from "@/components/PendingApproval";
import { SettingsPage } from "@/components/SettingsPage";
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profileData, isProfileComplete, loading: profileLoading, updateProfile, refreshProfile } = useProfileCompletion();
  const { status: userStatus, hasRssUrl, profile, keywords } = useUserStatus();
  const { unreadCount } = useNotifications();

  // Debug: Log when Index component loads
  console.log("🔧 [INDEX] Index component loaded with:", {
    currentPath: window.location.pathname,
    currentSearch: window.location.search,
    currentHash: window.location.hash,
    urlParams: Object.fromEntries(searchParams.entries())
  });

  useEffect(() => {
    // Check for password reset tokens in hash fragments on root page
    const hash = window.location.hash;
    if (hash && hash.includes('access_token') && hash.includes('type=recovery')) {
      console.log("🔧 [INDEX] Password reset tokens detected in hash, redirecting to auth callback");
      // Redirect to the auth callback route with the hash parameters
      window.location.href = `/auth/callback${hash}`;
      return;
    }

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasKeywords(false);
        setIsLoading(false);
        return;
      }

      // Try new API endpoint first, fallback to old endpoint
      try {
        const { apiFetch } = await import('@/lib/api');
        const response = await apiFetch(`/admin/keywords-management?user_id=${user.id}`);

        if (response.ok) {
          const result = await response.json();
          setHasKeywords(result.success && result.data && result.data.length > 0);
          return;
        }
      } catch (newApiError) {
        console.log("New API endpoint not available, falling back to old endpoint");
      }

      // Fallback to old direct Supabase query
      const { data: keywords, error } = await supabase
        .from('keywords')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (error) {
        console.error("Error checking keywords:", error);
        setHasKeywords(false);
      } else {
        setHasKeywords(keywords && keywords.length > 0);
      }
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
  // Handle emergency signin - redirect to settings
  if (user && searchParams.get('emergency') === 'true') {
    console.log("🔧 [INDEX] Emergency signin detected, rendering SettingsPage with params:", {
      emergency: searchParams.get('emergency'),
      tab: searchParams.get('tab'),
      allParams: Object.fromEntries(searchParams.entries())
    });
    return (
      <SettingsPage 
        onSignOut={handleSignOut}
      />
    );
  }

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
