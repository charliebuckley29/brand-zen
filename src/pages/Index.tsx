import { useState, useEffect } from "react";
import { MainDashboard } from "@/components/MainDashboard";
import { Auth } from "@/components/Auth";
import { DemoData } from "@/components/DemoData";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [hasKeywords, setHasKeywords] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDemo, setShowDemo] = useState(false);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show demo if requested
  if (showDemo) {
    return (
      <div>
        <div className="fixed top-4 right-4 z-50">
          <Button variant="outline" onClick={() => setShowDemo(false)}>
            Exit Demo
          </Button>
        </div>
        <DemoData />
      </div>
    );
  }

  // Show authentication if not logged in
  if (!user) {
    return (
      <div>
        <div className="fixed top-3 right-3 z-50">
          <Button variant="outline" size="sm" onClick={() => setShowDemo(true)} className="text-xs">
            <span className="hidden sm:inline">View Demo</span>
            <span className="sm:hidden">Demo</span>
          </Button>
        </div>
        <Auth />
      </div>
    );
  }

  // Show dashboard (MainDashboard handles brand setup if no keywords)
  if (user) {

    return (
      <div>
        <div className="fixed top-3 right-3 z-50 flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" size="sm" onClick={() => setShowDemo(true)} className="text-xs">
            <span className="hidden sm:inline">View Demo</span>
            <span className="sm:hidden">Demo</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="text-xs">
            <span className="hidden sm:inline">Sign Out</span>
            <span className="sm:hidden">Exit</span>
          </Button>
        </div>
        <MainDashboard 
          onSignOut={handleSignOut}
          hasKeywords={hasKeywords || false}
          onKeywordsUpdated={() => setHasKeywords(true)}
        />
      </div>
    );
  }

  return null;
};

export default Index;
