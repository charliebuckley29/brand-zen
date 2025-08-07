import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MentionsTable } from "./MentionsTable";
import { MentionModal } from "./MentionModal";
import { TrendingUp, AlertTriangle, MessageSquare, BarChart3, RefreshCw } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

// Demo data for the dashboard
const demoMentions = [
  {
    id: "1",
    source_name: "TechCrunch",
    source_url: "https://techcrunch.com/example",
    published_at: "2024-01-08T10:30:00Z",
    content_snippet: "The brand's latest product launch has been receiving positive feedback from early adopters, with many praising its innovative features and user-friendly design.",
    full_text: "The brand's latest product launch has been receiving positive feedback from early adopters, with many praising its innovative features and user-friendly design. Industry experts believe this could be a game-changer in the market.",
    sentiment: "positive",
    topics: ["product launch", "innovation", "user feedback"],
    flagged: false,
    escalation_type: "none",
    internal_notes: null,
  },
  {
    id: "2",
    source_name: "The Verge",
    source_url: "https://theverge.com/example",
    published_at: "2024-01-08T08:15:00Z",
    content_snippet: "Several users have reported issues with the company's customer service response times, leading to frustration on social media platforms.",
    full_text: "Several users have reported issues with the company's customer service response times, leading to frustration on social media platforms. The company has not yet responded to these concerns publicly.",
    sentiment: "negative",
    topics: ["customer service", "social media", "user complaints"],
    flagged: true,
    escalation_type: "pr",
    internal_notes: "Need to address customer service issues immediately",
  },
  {
    id: "3",
    source_name: "Business Insider",
    source_url: "https://businessinsider.com/example",
    published_at: "2024-01-07T16:45:00Z",
    content_snippet: "The company announced its quarterly earnings, meeting analyst expectations with steady growth across all sectors.",
    full_text: "The company announced its quarterly earnings, meeting analyst expectations with steady growth across all sectors. The CEO highlighted strong performance in international markets.",
    sentiment: "neutral",
    topics: ["earnings", "financial performance", "growth"],
    flagged: false,
    escalation_type: "none",
    internal_notes: null,
  },
  {
    id: "4",
    source_name: "Reuters",
    source_url: "https://reuters.com/example",
    published_at: "2024-01-07T14:20:00Z",
    content_snippet: "Legal experts suggest the ongoing patent dispute could have significant implications for the company's future product development.",
    full_text: "Legal experts suggest the ongoing patent dispute could have significant implications for the company's future product development. The case is expected to be resolved within the next quarter.",
    sentiment: "negative",
    topics: ["legal issue", "patent dispute", "product development"],
    flagged: true,
    escalation_type: "legal",
    internal_notes: "Monitor legal proceedings closely",
  },
  {
    id: "5",
    source_name: "Forbes",
    source_url: "https://forbes.com/example",
    published_at: "2024-01-07T11:10:00Z",
    content_snippet: "Industry analysts are impressed with the company's sustainability initiatives and their commitment to environmental responsibility.",
    full_text: "Industry analysts are impressed with the company's sustainability initiatives and their commitment to environmental responsibility. The new green technology implementation has exceeded expectations.",
    sentiment: "positive",
    topics: ["sustainability", "environmental", "corporate responsibility"],
    flagged: false,
    escalation_type: "none",
    internal_notes: null,
  },
];

export function DemoData() {
  const [mentions, setMentions] = useState(demoMentions);
  const [selectedMention, setSelectedMention] = useState<typeof demoMentions[0] | null>(null);
  
  const stats = {
    total: mentions.length,
    positive: mentions.filter(m => m.sentiment === 'positive').length,
    neutral: mentions.filter(m => m.sentiment === 'neutral').length,
    negative: mentions.filter(m => m.sentiment === 'negative').length,
    flagged: mentions.filter(m => m.flagged).length,
  };

  const getSentimentEmoji = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return '✅';
      case 'negative': return '❌';
      case 'neutral': return '⚠️';
      default: return '❓';
    }
  };

  const refreshData = () => {
    // Simulate new data by shuffling the array
    const shuffled = [...demoMentions].sort(() => Math.random() - 0.5);
    setMentions(shuffled);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Brand Monitoring Dashboard</h1>
            <p className="text-muted-foreground">Track and analyze brand mentions across the web</p>
            <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-700 border-blue-200">
              Demo Mode
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
            <Button variant="outline">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Reports
            </Button>
            <ThemeToggle />
          </div>
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
              <p className="text-xs text-muted-foreground">
                +20% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Positive</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.positive}</div>
              <p className="text-xs text-muted-foreground">
                +15% from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Neutral</CardTitle>
              <div className="h-4 w-4 bg-yellow-500 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.neutral}</div>
              <p className="text-xs text-muted-foreground">
                -5% from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Negative</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.negative}</div>
              <p className="text-xs text-muted-foreground">
                +8% from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flagged</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.flagged}</div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
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

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full justify-start">
                <MessageSquare className="w-4 h-4 mr-2" />
                Setup New Brand
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Review Flagged Items
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Mention Detail Modal */}
        {selectedMention && (
          <MentionModal
            mention={selectedMention}
            onClose={() => setSelectedMention(null)}
            onUpdate={() => {}} // Demo mode - no real updates
            getSentimentEmoji={getSentimentEmoji}
          />
        )}
      </div>
    </div>
  );
}