import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MentionsTable } from "./MentionsTable";
import { MonitoringControls } from "./MonitoringControls";
import { MentionModal } from "./MentionModal";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, AlertTriangle, MessageSquare, BarChart3, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { excludeMention } from "@/lib/monitoring";
import { useSourcePreferences } from "@/hooks/useSourcePreferences";
import { AutomationStatus } from "@/components/AutomationStatus";
import { RealtimeIndicator } from "@/components/RealtimeIndicator";

interface Mention {
  id: string;
  source_name: string;
  source_url: string;
  source_type: string;
  published_at: string;
  content_snippet: string;
  full_text: string | null;
  sentiment: number | null; // -1 = unknown, 0 = strongly negative, 100 = strongly positive
  topics: string[];
  flagged: boolean;
  escalation_type: string;
  internal_notes: string | null;
}

export function Dashboard() {
  const [mentions, setMentions] = useState<Mention[]>([]);
  console.log('DASHBOARD RENDER', mentions);
  const [selectedMention, setSelectedMention] = useState<Mention | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalMentions, setTotalMentions] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    flagged: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();
  const { enabledMentions } = useSourcePreferences();

  useEffect(() => {
    fetchMentions();
  }, [enabledMentions, currentPage, pageSize]);

  // Set up realtime subscription for new mentions
  useEffect(() => {
    const channel = supabase
      .channel('mentions-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mentions'
        },
        (payload) => {
          console.log('New mention received via realtime:', payload.new);
          
          // Add the new mention to the existing list if it passes filters
          const newMention = payload.new as Mention;
          if (enabledMentions.includes(newMention.source_type as any)) {
            setMentions(prev => [newMention, ...prev.slice(0, pageSize - 1)]);
            
            // Show toast notification for new mention
            toast({
              title: "New mention found!",
              description: `From ${newMention.source_name}: ${newMention.content_snippet.slice(0, 100)}...`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabledMentions, pageSize, toast]);

  const fetchMentions = async () => {
  console.log('FETCH MENTIONS CALLED');
    try {
      const types = enabledMentions;
      
      // Fetch paginated mentions
      let mentionsQuery = supabase
        .from("mentions")
        .select("*", { count: 'exact' })
        .order("published_at", { ascending: false })
        .range((currentPage - 1) * pageSize, (currentPage * pageSize) - 1);

      // Fetch stats
      let statsQuery = supabase
        .from("mentions")
        .select('id, sentiment, flagged', { count: 'exact' });

      if (types.length && types.length < 4) {
        mentionsQuery = (mentionsQuery as any).in("source_type", types as any);
        statsQuery = (statsQuery as any).in("source_type", types as any);
      }

      const [mentionsResult, statsResult] = await Promise.all([
        mentionsQuery,
        statsQuery
      ]);

      if (mentionsResult.error) throw mentionsResult.error;
      if (statsResult.error) throw statsResult.error;

  // Debug: log raw mentions data from Supabase before setting state
  console.log('Dashboard: raw mentions from Supabase', (mentionsResult.data || []).map(m => ({ id: m.id, sentiment: m.sentiment, type: typeof m.sentiment })));
  setMentions(mentionsResult.data || []);
  setTotalMentions(mentionsResult.count || 0);
      
      // Calculate stats using the new sentiment categorization
      const total = statsResult.count || 0;
      const positive = statsResult.data?.filter(m => m.sentiment !== null && m.sentiment !== -1 && m.sentiment >= 51).length || 0;
      const neutral = statsResult.data?.filter(m => m.sentiment === 50).length || 0;
      const negative = statsResult.data?.filter(m => m.sentiment !== null && m.sentiment !== -1 && m.sentiment <= 49).length || 0;
      const flagged = statsResult.data?.filter(m => m.flagged).length || 0;

      setStats({ total, positive, neutral, negative, flagged });
    } catch (error) {
      console.error("Error fetching mentions:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleRefreshMentions = async () => {
    try {
      setIsRefreshing(true);
      const rssEnabled = (typeof window !== 'undefined') ? localStorage.getItem('rss_news_ingestion') !== 'false' : true;
      const googleAlertsEnabled = (typeof window !== 'undefined') ? localStorage.getItem('google_alerts_enabled') !== 'false' : true;
      
      const calls = [supabase.functions.invoke('aggregate-sources', { body: {} })];
      if (rssEnabled) calls.push(supabase.functions.invoke('monitor-news', { body: {} }));
      if (googleAlertsEnabled) calls.push(supabase.functions.invoke('google-alerts', { body: {} }));
      
      await Promise.allSettled(calls as any);
      await fetchMentions();
      toast({ title: "Mentions refreshed", description: "Fetched latest mentions." });
    } catch (err) {
      console.error("Error refreshing mentions:", err);
      toast({ title: "Refresh failed", description: "Could not fetch new mentions.", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearMentions = async () => {
    try {
      setIsClearing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Not signed in", description: "Please sign in to clear mentions.", variant: "destructive" });
        return;
      }
      const { error } = await supabase
        .from('mentions')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
      await fetchMentions();
      toast({ title: "Mentions cleared", description: "All your mentions were removed." });
    } catch (err) {
      console.error("Error clearing mentions:", err);
      toast({ title: "Clear failed", description: "Could not delete mentions.", variant: "destructive" });
    } finally {
      setIsClearing(false);
    }
  };

  const getSentimentEmoji = (sentiment: number | null) => {
    if (sentiment === null) return '⏳'; // Pending
    if (sentiment === -1) return '❓'; // Unknown
    if (sentiment === 50) return '🟡'; // Neutral
    if (sentiment <= 49) return '🔴'; // Negative
    if (sentiment >= 51) return '🟢'; // Positive
    return '🟡'; // Default to neutral for any edge cases
  };

  const handleNotMe = async (mentionId: string) => {
    try {
      await excludeMention(mentionId);
      setMentions(prev => prev.filter(m => m.id !== mentionId));
      setStats(s => ({ ...s, total: Math.max(0, s.total - 1) }));
      toast({ title: "Removed", description: "We’ll ignore this source for this brand going forward." });
    } catch (err) {
      console.error("Exclude failed", err);
      toast({ title: "Action failed", description: "Couldn’t exclude this mention.", variant: "destructive" });
    }
  };
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Brand Monitoring Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track and analyze brand mentions across the web</p>
        </div>
        
        <RealtimeIndicator />
      </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Mentions</CardTitle>
              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Positive</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-success">{stats.positive}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Neutral</CardTitle>
              <div className="h-3 w-3 sm:h-4 sm:w-4 bg-warning rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-warning">{stats.neutral}</div>
            </CardContent>
          </Card>

          <Card className="sm:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Negative</CardTitle>
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-destructive">{stats.negative}</div>
            </CardContent>
          </Card>

          <Card className="sm:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Flagged</CardTitle>
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-warning">{stats.flagged}</div>
            </CardContent>
          </Card>

          <AutomationStatus />
        </div>

        {/* Monitoring Controls */}
        <MonitoringControls onMentionsUpdated={fetchMentions} />

        {/* Mentions Table */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Recent Mentions</CardTitle>
            <CardDescription className="text-sm">
              Click on any mention to view details and take action
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <MentionsTable 
              mentions={mentions} 
              onMentionClick={setSelectedMention}
              getSentimentEmoji={getSentimentEmoji}
              onNotMe={(id) => handleNotMe(id)}
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalMentions}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </CardContent>
        </Card>

        {/* Mention Detail Modal */}
        {selectedMention && (
          <MentionModal
            mention={selectedMention}
            onClose={() => setSelectedMention(null)}
            onUpdate={fetchMentions}
            getSentimentEmoji={getSentimentEmoji}
          />
        )}
      </div>
    );
  }