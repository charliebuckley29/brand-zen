/**
 * Main Application Component
 * 
 * This is the root component of the Brand Protected application. It sets up all the
 * necessary providers and routing for the entire application.
 * 
 * Key responsibilities:
 * - Configure React Query for data fetching and caching
 * - Set up routing with React Router
 * - Provide theme and timezone context
 * 
 * Last updated: Testing git commit functionality
 * - Wrap the app with error boundaries for error handling
 * - Initialize performance monitoring in development
 * - Set up global UI components (toasters, tooltips)
 * 
 * @author Brand Protected Team
 * @version 1.0.0
 */

import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TimezoneProvider } from "@/contexts/TimezoneContext";
import { AppErrorBoundary } from "@/components/ErrorBoundaries";
import { PerformanceMonitor } from "@/store/performanceStore";
import { logger } from "@/lib/logger";
import Index from "./pages/Index";
import Help from "./pages/Help";
import PrivacyPolicy from "./pages/PrivacyPolicy";
// New consolidated admin structure
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersOverview from "./pages/admin/users/UsersOverview";
import MonitoringOverview from "./pages/admin/monitoring/MonitoringOverview";
import ConfigurationOverview from "./pages/admin/configuration/ConfigurationOverview";
import ToolsOverview from "./pages/admin/tools/ToolsOverview";

// Legacy admin pages (redirected to new structure)
import AdminUserQuotaManagement from "./pages/AdminUserQuotaManagement";
import AdminModeratorsPanel from "./pages/AdminModeratorsPanel";
import AdminBugReportsPage from "./pages/AdminBugReportsPage";
import AdminTwilioPanel from "./pages/AdminTwilioPanel";
import AdminMonitoringPanel from "./pages/AdminMonitoringPanel";
import AdminUnifiedMonitoring from "./pages/AdminUnifiedMonitoring";
import AdminApiLimitsPanel from "./pages/AdminApiLimitsPanel";
import AdminTestDebugTools from "./pages/AdminTestDebugTools";
import AdminEmailDeliveryMonitoring from "./pages/AdminEmailDeliveryMonitoring";
import QueueErrorMonitoringPage from "./pages/QueueErrorMonitoringPage";
import AutomatedRecoveryPage from "./pages/admin/monitoring/AutomatedRecoveryPage";
import SystemAlertsPage from "./pages/SystemAlertsPage";
import EnhancedAnalyticsPage from "./pages/admin/monitoring/EnhancedAnalyticsPage";
import NewUserSignUp from "./pages/NewUserSignUp";
import { PasswordSetup } from "./components/PasswordSetup";
import { EmergencySignin } from "./components/EmergencySignin";
import NotFound from "./pages/NotFound";

/**
 * React Query Client Configuration
 * 
 * Configures the global React Query client with optimized settings for
 * data fetching, caching, and error handling.
 * 
 * Key features:
 * - Smart retry logic (no retry on 4xx errors, exponential backoff for 5xx)
 * - Data freshness management (5min stale time, 10min cache time)
 * - Optimized for both development and production use
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors like bad request, unauthorized)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors (5xx server errors, network issues)
        return failureCount < 3;
      },
      // Exponential backoff for retries: 1s, 2s, 4s, max 30s
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Data freshness: consider data stale after 5 minutes
      staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
      // Cache time: keep data in cache for 10 minutes after last use
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime) - garbage collection
    },
  },
});

/**
 * Main App Component
 * 
 * The root component that renders the entire application with all necessary
 * providers and routing configuration.
 * 
 * Provider hierarchy (outer to inner):
 * 1. AppErrorBoundary - Catches and handles React errors
 * 2. QueryClientProvider - Provides React Query for data fetching
 * 3. ThemeProvider - Handles light/dark theme switching
 * 4. TimezoneProvider - Manages user timezone preferences
 * 5. TooltipProvider - Enables tooltip functionality
 * 6. BrowserRouter - Handles client-side routing
 * 
 * @returns JSX.Element - The complete application tree
 */
const App = () => {
  // Initialize performance monitoring and logging
  React.useEffect(() => {
    logger.info('App initialized with performance monitoring');
  }, []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TimezoneProvider>
            <TooltipProvider>
              {/* Global UI components */}
              <Toaster />
              <Sonner />
              
              {/* Main application routing */}
              <BrowserRouter>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/new-user-signup" element={<NewUserSignUp />} />
                  <Route path="/password-setup" element={<PasswordSetup />} />
                  <Route path="/auth/callback" element={<EmergencySignin />} />
                  
                  {/* Admin routes - protected by role-based access */}
                  
                  {/* New consolidated admin structure */}
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/" element={<AdminDashboard />} />
                  
                  {/* User Management Section */}
                  <Route path="/admin/users" element={<UsersOverview />} />
                  <Route path="/admin/users/quotas" element={<AdminUserQuotaManagement />} />
                  <Route path="/admin/users/moderators" element={<AdminModeratorsPanel />} />
                  <Route path="/admin/users/approvals" element={<AdminModeratorsPanel />} />
                  
                  {/* Monitoring Section */}
                  <Route path="/admin/monitoring" element={<MonitoringOverview />} />
                  <Route path="/admin/monitoring/overview" element={<AdminUnifiedMonitoring />} />
                  <Route path="/admin/monitoring/queues" element={<QueueErrorMonitoringPage />} />
                  <Route path="/admin/monitoring/alerts" element={<SystemAlertsPage />} />
                  <Route path="/admin/monitoring/analytics" element={<EnhancedAnalyticsPage />} />
                  <Route path="/admin/monitoring/recovery" element={<AutomatedRecoveryPage />} />
                  
                  {/* Configuration Section */}
                  <Route path="/admin/configuration" element={<ConfigurationOverview />} />
                  <Route path="/admin/configuration/integrations" element={<AdminTwilioPanel />} />
                  <Route path="/admin/configuration/email" element={<AdminEmailDeliveryMonitoring />} />
                  
                  {/* Tools Section */}
                  <Route path="/admin/tools" element={<ToolsOverview />} />
                  <Route path="/admin/tools/debug" element={<AdminTestDebugTools />} />
                  <Route path="/admin/tools/testing" element={<AdminTestDebugTools />} />
                  <Route path="/admin/tools/logs" element={<AdminUnifiedMonitoring />} />
                  <Route path="/admin/tools/bug-reports" element={<AdminBugReportsPage />} />
                  
                  {/* Legacy routes (redirected to new structure) */}
                  <Route path="/admin/api" element={<AdminUserQuotaManagement />} />
                  <Route path="/admin/moderators" element={<AdminModeratorsPanel />} />
                  <Route path="/admin/bug-reports" element={<AdminBugReportsPage />} />
                  <Route path="/admin/twilio" element={<AdminTwilioPanel />} />
                  <Route path="/admin/unified-monitoring" element={<AdminUnifiedMonitoring />} />
                  <Route path="/admin/unified-monitoring/" element={<AdminUnifiedMonitoring />} />
                  <Route path="/admin/api-limits" element={<AdminApiLimitsPanel />} />
                  <Route path="/admin/email-delivery" element={<AdminEmailDeliveryMonitoring />} />
                  <Route path="/admin/email-delivery/" element={<AdminEmailDeliveryMonitoring />} />
                  <Route path="/admin/queue-errors" element={<QueueErrorMonitoringPage />} />
                  <Route path="/admin/queue-errors/" element={<QueueErrorMonitoringPage />} />
                  <Route path="/admin/automated-recovery" element={<AutomatedRecoveryPage />} />
                  <Route path="/admin/automated-recovery/" element={<AutomatedRecoveryPage />} />
                  <Route path="/admin/system-alerts" element={<SystemAlertsPage />} />
                  <Route path="/admin/system-alerts/" element={<SystemAlertsPage />} />
                  <Route path="/admin/enhanced-analytics" element={<EnhancedAnalyticsPage />} />
                  <Route path="/admin/enhanced-analytics/" element={<EnhancedAnalyticsPage />} />
                  <Route path="/admin/test-debug" element={<AdminTestDebugTools />} />
                  <Route path="/admin/test-debug/" element={<AdminTestDebugTools />} />
                  
                  {/* Catch-all route for 404 pages */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              
              {/* Development-only tools */}
              {process.env.NODE_ENV === 'development' && (
                <PerformanceMonitor />
              )}
            </TooltipProvider>
          </TimezoneProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
};

export default App;
