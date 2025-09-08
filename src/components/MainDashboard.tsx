import { useState, useEffect } from "react";
import { Dashboard } from "@/components/Dashboard";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { ReportsPage } from "@/components/ReportsPage";
import { SettingsPage } from "@/components/SettingsPage";
import { BrandSetup } from "@/components/BrandSetup";
import { Navigation } from "@/components/Navigation";
import { ModeratorPanel } from "@/components/ModeratorPanel";
import { supabase } from "@/integrations/supabase/client";
import { startMonitoring } from "@/lib/monitoring";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";

interface MainDashboardProps {
  onSignOut: () => void;
  hasKeywords: boolean;
  onKeywordsUpdated: () => void;
}

export function MainDashboard({ onSignOut, hasKeywords, onKeywordsUpdated }: MainDashboardProps) {
  const [currentView, setCurrentView] = useState("dashboard");
  const [unreadCount, setUnreadCount] = useState(0);
  const { isModerator } = useUserRole();

  useEffect(() => {
    if (hasKeywords) {
      checkUnreadMentions();
    }
  }, [hasKeywords]);

  const checkUnreadMentions = async () => {
    try {
      // Check for mentions from the last 24 hours that might be "new"
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data, error } = await supabase
        .from("mentions")
        .select("id")
        .gte("created_at", yesterday.toISOString())
        .eq("flagged", true);

      if (error) throw error;
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error("Error checking unread mentions:", error);
    }
  };

  const renderCurrentView = () => {
    if (!hasKeywords) {
      return <BrandSetup onComplete={onKeywordsUpdated} />;
    }

    switch (currentView) {
      case "analytics":
        return <AnalyticsChart />;
      case "reports":
        return <ReportsPage />;
      case "settings":
        return <SettingsPage onSignOut={onSignOut} />;
      case "brand-setup":
        return <BrandSetup onComplete={onKeywordsUpdated} />;
      case "moderator":
        return isModerator ? <ModeratorPanel /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        currentView={currentView} 
        onViewChange={setCurrentView}
        unreadCount={unreadCount}
      />
      
      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen">
        <div className="p-3 sm:p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8">
          {renderCurrentView()}
        </div>
      </div>
    </div>
  );
}