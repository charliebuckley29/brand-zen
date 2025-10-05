import { useState, useEffect } from "react";
import { Dashboard } from "@/components/Dashboard";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { ReportsPage } from "@/components/ReportsPage";
import { SettingsPage } from "@/components/SettingsPage";
import { BrandSetup } from "@/components/BrandSetup";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ModeratorPanel } from "@/components/ModeratorPanel";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { useNavigation } from "@/contexts/NavigationContext";

interface MainDashboardProps {
  onSignOut: () => void;
  hasKeywords: boolean;
  onKeywordsUpdated: () => void;
  unreadCount: number;
}

export function MainDashboard({ onSignOut, hasKeywords, onKeywordsUpdated, unreadCount }: MainDashboardProps) {
  const { isModerator } = useUserRole();
  const { currentView } = useNavigation();

  // Note: unreadCount is now passed as prop from Index.tsx

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
        unreadCount={unreadCount}
      />
      
      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <div className="flex-1 p-3 sm:p-4 lg:p-8 pt-20 sm:pt-16 lg:pt-8">
          {renderCurrentView()}
        </div>
        <Footer />
      </div>
    </div>
  );
}