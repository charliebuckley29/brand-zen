import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MentionsTable } from "./MentionsTable";
import { MentionModal } from "./MentionModal";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, AlertTriangle, MessageSquare, BarChart3 } from "lucide-react";

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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Brand Monitoring Dashboard</h1>
            <p className="text-muted-foreground">Track and analyze brand mentions across the web</p>
          </div>
          <Button variant="outline">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Reports
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Mentions</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Positive</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.positive}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Neutral</CardTitle>
              <div className="h-4 w-4 bg-yellow-500 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.neutral}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Negative</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.negative}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flagged</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.flagged}</div>
            </CardContent>
          </Card>
        </div>

        {/* Mentions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Mentions</CardTitle>
            <CardDescription>
              Click on any mention to view details and take action
            </CardDescription>
          </CardHeader>
          <CardContent>
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
    </div>
  );
}