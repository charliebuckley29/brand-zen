import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TimezoneProvider } from "@/contexts/TimezoneContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Help from "./pages/Help";
import AdminDashboard from "./pages/AdminDashboard";
import AdminApiPanel from "./pages/AdminApiPanel";
import AdminModeratorsPanel from "./pages/AdminModeratorsPanel";
import AdminBugReportsPage from "./pages/AdminBugReportsPage";
import AdminTwilioPanel from "./pages/AdminTwilioPanel";
import AdminMonitoringPanel from "./pages/AdminMonitoringPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TimezoneProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/help" element={<Help />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/api" element={<AdminApiPanel />} />
                <Route path="/admin/moderators" element={<AdminModeratorsPanel />} />
                <Route path="/admin/bug-reports" element={<AdminBugReportsPage />} />
                <Route path="/admin/twilio" element={<AdminTwilioPanel />} />
                <Route path="/admin/monitoring" element={<AdminMonitoringPanel />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </TimezoneProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
