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

interface Mention {
  id: string;
  source_name: string;
  source_url: string;
  published_at: string;
  content_snippet: string;
  full_text: string | null;
  sentiment: string | null;
  topics: string[];
  flagged: boolean;
  escalation_type: string;
  internal_notes: string | null;
}

export function Dashboard() {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [selectedMention, setSelectedMention] = useState<Mention | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    fetchMentions();
  }, []);

  const fetchMentions = async () => {
    try {
      const { data, error } = await supabase
        .from("mentions")
        .select("*")
        .order("published_at", { ascending: false });

      if (error) throw error;

      setMentions(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const positive = data?.filter(m => m.sentiment === 'positive').length || 0;
      const neutral = data?.filter(m => m.sentiment === 'neutral').length || 0;
      const negative = data?.filter(m => m.sentiment === 'negative').length || 0;
      const flagged = data?.filter(m => m.flagged).length || 0;

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
      const { data, error } = await supabase.functions.invoke('monitor-news', { body: {} });
      if (error) throw error;
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

  const getSentimentEmoji = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return '✅';
      case 'negative': return '❌';
      case 'neutral': return '⚠️';
      default: return '❓';
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
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <Button variant="outline" className="w-full sm:w-auto">
            <BarChart3 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">View Reports</span>
            <span className="sm:hidden">Reports</span>
          </Button>
        </div>
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