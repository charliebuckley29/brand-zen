import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, BarChart3, FileText, Download } from "lucide-react";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format, parse } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { downloadReportPdf } from "@/lib/reportPdf";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSourcePreferences } from "@/hooks/useSourcePreferences";

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
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const { toast } = useToast();
  const { enabledReports } = useSourcePreferences();

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
    // Support formats: yyyy-MM or yyyy-MM-dd..yyyy-MM-dd
    if (/^\d{4}-\d{2}$/.test(ym)) {
      try {
        const d = parse(`${ym}-01`, 'yyyy-MM-dd', new Date());
        return format(d, 'LLLL yyyy');
      } catch { return ym; }
    }
    if (/^\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}$/.test(ym)) {
      const [s, e] = ym.split('..');
      try {
        const sd = parse(s, 'yyyy-MM-dd', new Date());
        const ed = parse(e, 'yyyy-MM-dd', new Date());
        return `${format(sd, 'PPP')} – ${format(ed, 'PPP')}`;
      } catch { return ym; }
    }
    return ym;
  };
  const generateReport = async () => {
    toast({ title: "Generating report", description: "Calculating metrics…" });

    try {
      const now = new Date();
      const defaultStart = startOfMonth(now);
      const defaultEnd = endOfMonth(now);

      const isCustom = !!(startDate && endDate);
      const rangeStart = isCustom ? startOfDay(startDate!) : defaultStart;
      const rangeEnd = isCustom ? endOfDay(endDate!) : defaultEnd;

      const periodKey = isCustom
        ? `${format(rangeStart, 'yyyy-MM-dd')}..${format(rangeEnd, 'yyyy-MM-dd')}`
        : format(defaultStart, 'yyyy-MM');

      // Fetch mentions within range (RLS restricts to current user)
      let query = supabase
        .from("mentions")
        .select("sentiment, source_name")
        .gte("published_at", rangeStart.toISOString())
        .lte("published_at", rangeEnd.toISOString());
      if (enabledReports.length && enabledReports.length < 4) {
        query = (query as any).in("source_type", enabledReports as any);
      }
      const { data: mentions, error: mentionsError } = await query;
      if (mentionsError) throw mentionsError;

      const sourceCounts = new Map<string, number>();
      let total = 0, pos = 0, neg = 0, neu = 0;
      (mentions || []).forEach((m) => {
        total += 1;
        if (m.sentiment === 'positive') pos += 1;
        else if (m.sentiment === 'negative') neg += 1;
        else neu += 1;
        if (m.source_name) sourceCounts.set(m.source_name, (sourceCounts.get(m.source_name) || 0) + 1);
      });
      const topSources = Array.from(sourceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (!isCustom) {
        await supabase
          .from('reports')
          .delete()
          .eq('user_id', user.id)
          .eq('report_month', periodKey);
      }

      const newReport = {
        user_id: user.id,
        report_month: periodKey,
        total_mentions: total,
        positives: pos,
        negatives: neg,
        neutrals: neu,
        top_sources: topSources as string[],
      };

      const { error: insertError } = await supabase.from('reports').insert(newReport);
      if (insertError) throw insertError;

      toast({ title: 'Report generated', description: isCustom ? 'Custom range report created.' : 'Monthly report created.' });
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
          <p className="text-sm sm:text-base text-muted-foreground">View and download brand monitoring reports</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 items-stretch sm:items-center">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="3">Last 3 Months</SelectItem>
              <SelectItem value="6">Last 6 Months</SelectItem>
              <SelectItem value="12">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>

          {/* Start Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full sm:w-[200px] justify-start", !startDate && "text-muted-foreground")}> 
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>Start date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {/* End Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full sm:w-[200px] justify-start", !endDate && "text-muted-foreground")}> 
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>End date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

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
                        <CalendarIcon className="h-5 w-5" />
                        {getMonthLabel(report.report_month)}
                      </CardTitle>
                      <CardDescription>
                        Generated on {new Date(report.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendIcon className={`h-5 w-5 ${color}`} />
                      <Badge variant="outline">{trend}</Badge>
                      <Button variant="outline" size="sm" onClick={() => downloadReportPdf(report)} aria-label={`Download report ${getMonthLabel(report.report_month)}`}>
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