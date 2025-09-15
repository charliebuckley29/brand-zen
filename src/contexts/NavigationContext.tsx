import { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContextType {
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedMentionId: string | null;
  setSelectedMentionId: (id: string | null) => void;
  navigateToMention: (mentionId: string) => void;
  clearSelectedMention: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [currentView, setCurrentView] = useState("dashboard");
  const [selectedMentionId, setSelectedMentionId] = useState<string | null>(null);

  const navigateToMention = (mentionId: string) => {
    setCurrentView("dashboard"); // Ensure we're on the dashboard
    setSelectedMentionId(mentionId); // Set the mention to be opened
  };

  const clearSelectedMention = () => {
    setSelectedMentionId(null);
  };

  const value: NavigationContextType = {
    currentView,
    setCurrentView,
    selectedMentionId,
    setSelectedMentionId,
    navigateToMention,
    clearSelectedMention,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
