import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingUp, TrendingDown, BarChart3, FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Report {
  id: string;
  report_month: string;
  total_mentions: number;
  positives: number;
  negatives: number;
  neutrals: number;
  top_sources: string[];
  created_at: string;
}

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
  }, [selectedPeriod]);

  const fetchReports = async () => {
    try {
      let query = supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedPeriod !== "all") {
        const months = parseInt(selectedPeriod);
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);
        query = query.gte("created_at", cutoffDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching reports",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentTrend = (report: Report) => {
    const total = report.total_mentions;
    const positiveRate = (report.positives / total) * 100;
    const negativeRate = (report.negatives / total) * 100;
    
    if (positiveRate > negativeRate) {
      return { trend: "positive", icon: TrendingUp, color: "text-success" };
    } else if (negativeRate > positiveRate) {
      return { trend: "negative", icon: TrendingDown, color: "text-destructive" };
    } else {
      return { trend: "neutral", icon: BarChart3, color: "text-muted-foreground" };
    }
  };

  const generateReport = async () => {
    toast({
      title: "Generating Report",
      description: "Creating a new monthly report...",
    });
    
    try {
      // In a real app, this would trigger report generation
      // For now, we'll simulate it
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      // Get mentions for current month to generate stats
      const { data: mentions, error } = await supabase
        .from("mentions")
        .select("sentiment, source_name")
        .gte("published_at", `${currentMonth}-01`)
        .lt("published_at", `${currentMonth}-31`);

      if (error) throw error;

      const stats = mentions?.reduce((acc: any, mention: any) => {
        acc.total++;
        if (mention.sentiment === "positive") acc.positives++;
        else if (mention.sentiment === "negative") acc.negatives++;
        else acc.neutrals++;
        
        acc.sources.add(mention.source_name);
        return acc;
      }, { total: 0, positives: 0, negatives: 0, neutrals: 0, sources: new Set() });

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const newReport = {
        user_id: user.id,
        report_month: currentMonth,
        total_mentions: stats?.total || 0,
        positives: stats?.positives || 0,
        negatives: stats?.negatives || 0,
        neutrals: stats?.neutrals || 0,
        top_sources: Array.from(stats?.sources || []).slice(0, 5) as string[],
      };

      const { error: insertError } = await supabase
        .from("reports")
        .insert(newReport);

      if (insertError) throw insertError;

      toast({
        title: "Report Generated",
        description: "Monthly report has been created successfully!",
      });
      
      fetchReports();
    } catch (error: any) {
      toast({
        title: "Error generating report",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">View and download monthly brand monitoring reports</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="3">Last 3 Months</SelectItem>
              <SelectItem value="6">Last 6 Months</SelectItem>
              <SelectItem value="12">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generateReport}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first monthly report to see insights here.
            </p>
            <Button onClick={generateReport}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => {
            const { trend, icon: TrendIcon, color } = getSentimentTrend(report);
            
            return (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {new Date(report.report_month).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}
                      </CardTitle>
                      <CardDescription>
                        Generated on {new Date(report.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendIcon className={`h-5 w-5 ${color}`} />
                      <Badge variant="outline">{trend}</Badge>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{report.total_mentions}</div>
                      <div className="text-sm text-muted-foreground">Total Mentions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">{report.positives}</div>
                      <div className="text-sm text-muted-foreground">Positive</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-muted-foreground">{report.neutrals}</div>
                      <div className="text-sm text-muted-foreground">Neutral</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-destructive">{report.negatives}</div>
                      <div className="text-sm text-muted-foreground">Negative</div>
                    </div>
                  </div>
                  
                  {report.top_sources.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Top Sources</h4>
                      <div className="flex flex-wrap gap-2">
                        {report.top_sources.map((source) => (
                          <Badge key={source} variant="secondary">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}