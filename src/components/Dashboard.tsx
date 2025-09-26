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
import { showToastWithStorage } from "@/lib/notifications";
import { excludeMention } from "@/lib/monitoring";
import { useSourcePreferences } from "@/hooks/useSourcePreferences";
import { RealtimeIndicator } from "@/components/RealtimeIndicator";
import { useNavigation } from "@/contexts/NavigationContext";

interface Mention {
  id: string;
  source_name: string;
  source_url: string;
  source_type: string;
  published_at: string; // Source date (when content was originally published)
  created_at: string; // Found date (when our system discovered it)
  content_snippet: string;
  full_text: string | null;
  sentiment: number | null; // -1 = unknown, 0 = strongly negative, 100 = strongly positive
  topics: string[];
  flagged: boolean;
  escalation_type: string;
  internal_notes: string | null;
  legal_escalated_at: string | null;
  pr_escalated_at: string | null;
}

type SortField = 'published_at' | 'created_at' | 'source_name' | 'sentiment';
type SortDirection = 'asc' | 'desc';

export function Dashboard() {
  const [mentions, setMentions] = useState<Mention[]>([]);
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
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { toast } = useToast();
  const { enabledMentions } = useSourcePreferences();
  const { selectedMentionId, clearSelectedMention } = useNavigation();

  useEffect(() => {
    fetchMentions();
  }, [enabledMentions, currentPage, pageSize, sortField, sortDirection]);

  // Handle navigation to specific mention from notifications
  useEffect(() => {
    if (selectedMentionId && mentions.length > 0) {
      const mention = mentions.find(m => m.id === selectedMentionId);
      if (mention) {
        setSelectedMention(mention);
        clearSelectedMention(); // Clear the navigation state
      } else {
        // If mention not found in current page, fetch it specifically
        fetchSpecificMention(selectedMentionId);
      }
    }
  }, [selectedMentionId, mentions]);

  // Set up realtime subscription for new mentions
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('mentions-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mentions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            // Add the new mention to the existing list if it passes filters
            const newMention = payload.new as Mention;
            if (enabledMentions.includes(newMention.source_type as any)) {
              setMentions(prev => [newMention, ...prev.slice(0, pageSize - 1)]);
              
              // Show toast notification for new mention and store in database
              showToastWithStorage(
                toast,
                "New mention found!",
                `From ${newMention.source_name}: ${newMention.content_snippet.slice(0, 100)}...`,
                'default',
                'mention',
                {
                  mention_id: newMention.id,
                  source_name: newMention.source_name,
                  source_url: newMention.source_url,
                  sentiment: newMention.sentiment
                }
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeSubscription();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [enabledMentions, pageSize, toast]);

  const fetchMentions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      const types = enabledMentions;
      
      // Determine sort field and direction for database query
      const dbSortField = sortField === 'source_name' ? 'source_name' : 
                         sortField === 'sentiment' ? 'sentiment' :
                         sortField === 'published_at' ? 'published_at' :
                         sortField === 'created_at' ? 'created_at' : 'created_at';
      
      const ascending = sortDirection === 'asc';
      
      // Fetch paginated mentions for current user's keywords only
      let mentionsQuery = supabase
        .from("mentions")
        .select("*", { count: 'exact' })
        .eq('user_id', user.id)
        .order(dbSortField, { ascending })
        .range((currentPage - 1) * pageSize, (currentPage * pageSize) - 1);

      // Fetch stats for current user's mentions only
      let statsQuery = supabase
        .from("mentions")
        .select('id, sentiment, flagged', { count: 'exact' })
        .eq('user_id', user.id);

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

  const fetchSpecificMention = async (mentionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("mentions")
        .select("*")
        .eq('user_id', user.id)
        .eq('id', mentionId)
        .single();

      if (error) {
        console.error('Error fetching specific mention:', error);
        return;
      }

      if (data) {
        setSelectedMention(data);
        clearSelectedMention(); // Clear the navigation state
      }
    } catch (error) {
      console.error("Error fetching specific mention:", error);
    }
  };
  const handleRefreshMentions = async () => {
    try {
      setIsRefreshing(true);
      const googleAlertsEnabled = (typeof window !== 'undefined') ? localStorage.getItem('google_alerts_enabled') !== 'false' : true;
      
      const calls = [supabase.functions.invoke('aggregate-sources', { body: {} })];
      if (googleAlertsEnabled) calls.push(supabase.functions.invoke('google-alerts', { body: {} }));
      
      const results = await Promise.allSettled(calls as any);
      
      // Wait a moment for mentions to be processed, then refresh
      setTimeout(async () => {
        await fetchMentions();
      }, 2000);
      
      toast({ 
        title: "Fetch started", 
        description: "Checking all sources for new mentions. Results will appear shortly." 
      });
    } catch (err: any) {
      console.error("Error during manual fetch:", err);
      toast({ 
        title: "Queue undergoing maintenance", 
        description: "Our systems are currently being updated. Please try again in a few minutes.", 
        variant: "destructive" 
      });
    } finally {
      setIsRefreshing(false);
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
      toast({ title: "Removed", description: "We'll ignore this source for this brand going forward." });
    } catch (err) {
      console.error("Exclude failed", err);
      toast({ title: "Action failed", description: "Couldn't exclude this mention.", variant: "destructive" });
    }
  };

  const handleSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(1); // Reset to first page when sorting changes
    // Note: fetchMentions will be called automatically due to useEffect dependency
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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
        </div>


        {/* Monitoring Controls */}
        <MonitoringControls 
          onMentionsUpdated={fetchMentions}
        />

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
              onMentionClick={(m) => setSelectedMention(m)}
              getSentimentEmoji={getSentimentEmoji}
              onNotMe={(id) => handleNotMe(id)}
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalMentions}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          </CardContent>
        </Card>

        {/* Mention Detail Modal */}
        {selectedMention && (
          <MentionModal
            mention={selectedMention}
            onClose={() => {
              setSelectedMention(null);
              clearSelectedMention();
            }}
            onUpdate={fetchMentions}
            getSentimentEmoji={getSentimentEmoji}
          />
        )}
      </div>
    );
  }