import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, BarChart3, FileText, Download, Trash2 } from "lucide-react";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format, parse } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { downloadReportPdf } from "@/lib/reportPdf";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSourcePreferences } from "@/hooks/useSourcePreferences";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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

function getMonthLabel(ym: string) {
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
}

function getRangeFromKey(key: string): { start: Date; end: Date } {
  if (/^\d{4}-\d{2}$/.test(key)) {
    const d = parse(`${key}-01`, 'yyyy-MM-dd', new Date());
    return { start: startOfMonth(d), end: endOfMonth(d) };
  }
  if (/^\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}$/.test(key)) {
    const [s, e] = key.split('..');
    return { start: startOfDay(parse(s, 'yyyy-MM-dd', new Date())), end: endOfDay(parse(e, 'yyyy-MM-dd', new Date())) };
  }
  const now = new Date();
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

function ReportDetailsDialog({ report, enabledReports }: { report: Report; enabledReports: string[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <span className="sr-only">View details for {getMonthLabel(report.report_month)}</span>
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Details - {getMonthLabel(report.report_month)}</DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{report.total_mentions}</div>
            <div className="text-sm text-muted-foreground">Total</div>
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

        <ReportCharts report={report} enabledReports={enabledReports} />

        {report.top_sources.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Top Sources</h4>
            <div className="flex flex-wrap gap-2">
              {report.top_sources.map((source) => (
                <Badge key={source} variant="secondary">{source}</Badge>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReportCharts({ report, enabledReports }: { report: Report; enabledReports: string[] }) {
  const [chartData, setChartData] = useState<{ date: string; positive: number; neutral: number; negative: number }[]>([]);
  const [sourceData, setSourceData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { start, end } = getRangeFromKey(report.report_month);
      // Build base query
      let baseQuery = supabase
        .from('mentions')
        .select('published_at, sentiment, source_name, source_type', { count: 'exact' })
        .gte('published_at', start.toISOString())
        .lte('published_at', end.toISOString())
        .order('published_at');

      if (enabledReports.length && enabledReports.length < 4) {
        baseQuery = baseQuery.in('source_type', enabledReports);
      }

      // Get total count first
      const { count, error: countError } = await baseQuery;
      if (countError) { 
        console.error("Error fetching count:", countError);
        setLoading(false); 
        return; 
      }

      if (!count) {
        setChartData([]);
        setSourceData([]);
        setLoading(false);
        return;
      }

      // Fetch all data in chunks
      const chunkSize = 1000;
      const chunks = Math.ceil(count / chunkSize);
      let data: any[] = [];

      for (let i = 0; i < chunks; i++) {
        const { data: chunkData, error: fetchError } = await baseQuery
          .range(i * chunkSize, (i + 1) * chunkSize - 1);
        
        if (fetchError) {
          console.error("Error fetching chunk:", fetchError);
          setLoading(false);
          return;
        }

        if (chunkData) {
          data = [...data, ...chunkData];
        }
      }

      const daily = new Map<string, { positive: number; neutral: number; negative: number }>();
      const sources = new Map<string, number>();
      const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

      (data || []).forEach((m: any) => {
        const d = new Date(m.published_at).toLocaleDateString();
        if (!daily.has(d)) daily.set(d, { positive: 0, neutral: 0, negative: 0 });
        const bucket = daily.get(d)!;
        if (m.sentiment === 'positive') bucket.positive += 1;
        else if (m.sentiment === 'negative') bucket.negative += 1;
        else bucket.neutral += 1;
        if (m.source_name) sources.set(m.source_name, (sources.get(m.source_name) || 0) + 1);
      });

      const chartArr = Array.from(daily.entries()).map(([date, vals]) => ({ date, ...vals }));
      const sourceArr = Array.from(sources.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));

      setChartData(chartArr);
      setSourceData(sourceArr);
      setLoading(false);
    };
    load();
  }, [report.report_month, enabledReports]);

  if (loading) {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="border rounded-md p-4">
        <h4 className="font-semibold mb-2">Mentions Over Time</h4>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="positive" stroke="hsl(var(--success))" strokeWidth={2} />
            <Line type="monotone" dataKey="neutral" stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
            <Line type="monotone" dataKey="negative" stroke="hsl(var(--destructive))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="border rounded-md p-4">
        <h4 className="font-semibold mb-2">Top Sources</h4>
        {sourceData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" paddingAngle={5}>
                  {sourceData.map((s, i) => (<Cell key={s.name} fill={s.color} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {sourceData.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} /> <span className="text-sm">{s.name}</span></div>
                  <Badge variant="outline">{s.value}</Badge>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No source data</div>
        )}
      </div>
    </div>
  );
}

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const { toast } = useToast();
  const { enabledReports } = useSourcePreferences();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    // Update date range when period changes
    const end = new Date();
    const start = new Date();
    
    if (selectedPeriod === "all") {
      // For "All Time", set start to 1 year ago
      start.setFullYear(start.getFullYear() - 1);
    } else {
      // For other periods, set start based on selected months
      const months = parseInt(selectedPeriod);
      start.setMonth(start.getMonth() - months);
    }
    
    setStartDate(start);
    setEndDate(end);
    fetchReports();
  }, [selectedPeriod]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

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

const handleDelete = async (reportId: string, label: string) => {
    try {
      setDeletingId(reportId);
      const { error } = await supabase.from('reports').delete().eq('id', reportId);
      if (error) throw error;
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast({ title: 'Report deleted', description: `${label} has been removed.` });
    } catch (error: any) {
      toast({ title: 'Error deleting report', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
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
      let baseQuery = supabase
        .from("mentions")
        .select("sentiment, source_name", { count: 'exact' })
        .gte("published_at", rangeStart.toISOString())
        .lte("published_at", rangeEnd.toISOString());

      if (enabledReports.length && enabledReports.length < 4) {
        baseQuery = baseQuery.in("source_type", enabledReports);
      }

      // Get total count first
      const { count, error: countError } = await baseQuery;
      if (countError) throw countError;

      if (!count) {
        toast({ title: 'No mentions found', description: 'No data available for the selected period.', variant: 'destructive' });
        return;
      }

      // Fetch all data in chunks
      const chunkSize = 1000;
      const chunks = Math.ceil(count / chunkSize);
      let mentions: any[] = [];

      for (let i = 0; i < chunks; i++) {
        const { data: chunkData, error: fetchError } = await baseQuery
          .range(i * chunkSize, (i + 1) * chunkSize - 1);
        
        if (fetchError) throw fetchError;
        if (chunkData) {
          mentions = [...mentions, ...chunkData];
        }
      }

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

      const { error: insertError } = await supabase.from('reports').upsert(newReport as any, { onConflict: 'user_id,report_month' });
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
          <Select 
            value={selectedPeriod} 
            onValueChange={setSelectedPeriod}
          >
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
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Total Mentions</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => {
                const { trend, icon: TrendIcon, color } = getSentimentTrend(report);
                return (
                  <TableRow key={report.id}>
                    <TableCell>{getMonthLabel(report.report_month)}</TableCell>
                    <TableCell>{report.total_mentions}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TrendIcon className={`h-4 w-4 ${color}`} />
                        <Badge variant="outline">{trend}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(report.created_at), "PPp")}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <ReportDetailsDialog report={report} enabledReports={enabledReports} />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              setDownloadingId(report.id);
                              await downloadReportPdf(report, enabledReports);
                              toast({ title: 'Download started', description: `${getMonthLabel(report.report_month)} PDF is downloading.` });
                            } catch (e: any) {
                              toast({ title: 'Failed to download', description: e?.message || 'Unexpected error', variant: 'destructive' });
                            } finally {
                              setDownloadingId(null);
                            }
                          }}
                          disabled={downloadingId === report.id}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={deletingId === report.id}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this report?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. The report for {getMonthLabel(report.report_month)} will be permanently removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(report.id, getMonthLabel(report.report_month))} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}