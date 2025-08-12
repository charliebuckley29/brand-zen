import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingUp, TrendingDown, BarChart3, FileText, Download } from "lucide-react";
import { startOfMonth, endOfMonth, format, parse } from "date-fns";
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

  const getMonthLabel = (ym: string) => {
    try {
      const d = parse(`${ym}-01`, 'yyyy-MM-dd', new Date());
      return format(d, 'LLLL yyyy');
    } catch {
      return ym;
    }
  };

  const generateReport = async () => {
    toast({
      title: "Generating report",
      description: "Calculating this month’s metrics…",
    });

    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const monthKey = format(monthStart, 'yyyy-MM');

      // Fetch mentions within the month (RLS restricts to current user)
      const { data: mentions, error: mentionsError } = await supabase
        .from("mentions")
        .select("sentiment, source_name")
        .gte("published_at", monthStart.toISOString())
        .lte("published_at", monthEnd.toISOString());

      if (mentionsError) throw mentionsError;

      // Aggregate stats
      const sourceCounts = new Map<string, number>();
      let total = 0, pos = 0, neg = 0, neu = 0;
      (mentions || []).forEach((m) => {
        total += 1;
        if (m.sentiment === 'positive') pos += 1;
        else if (m.sentiment === 'negative') neg += 1;
        else neu += 1;
        if (m.source_name) {
          sourceCounts.set(m.source_name, (sourceCounts.get(m.source_name) || 0) + 1);
        }
      });
      const topSources = Array.from(sourceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);

      // Ensure authenticated to write report
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Replace existing month report for this user
      await supabase
        .from('reports')
        .delete()
        .eq('user_id', user.id)
        .eq('report_month', monthKey);

      const newReport = {
        user_id: user.id,
        report_month: monthKey,
        total_mentions: total,
        positives: pos,
        negatives: neg,
        neutrals: neu,
        top_sources: topSources as string[],
      };

      const { error: insertError } = await supabase
        .from('reports')
        .insert(newReport);
      if (insertError) throw insertError;

      toast({ title: 'Report generated', description: 'Monthly report created successfully.' });
      fetchReports();
    } catch (error: any) {
      toast({ title: 'Error generating report', description: error.message, variant: 'destructive' });
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Reports</h1>
          <p className="text-sm sm:text-base text-muted-foreground">View and download monthly brand monitoring reports</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="3">Last 3 Months</SelectItem>
              <SelectItem value="6">Last 6 Months</SelectItem>
              <SelectItem value="12">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generateReport} className="w-full sm:w-auto">
            <FileText className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Generate Report</span>
            <span className="sm:hidden">Generate</span>
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
                        {getMonthLabel(report.report_month)}
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