import { useState, useEffect } from "react";
import { BrandSetup } from "@/components/BrandSetup";
import { Dashboard } from "@/components/Dashboard";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [hasKeywords, setHasKeywords] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkKeywords();
  }, []);

  const checkKeywords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasKeywords(false);
        setIsLoading(false);
        return;
      }

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

  if (!hasKeywords) {
    return <BrandSetup onComplete={() => setHasKeywords(true)} />;
  }

  return <Dashboard />;
};

export default Index;
