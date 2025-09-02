import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSourcePreferences } from "@/hooks/useSourcePreferences";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { startOfDay, endOfDay, format } from "date-fns";
// removed duplicate useSourcePreferences import

interface ChartData {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

interface SourceData {
  name: string;
  value: number;
  color: string;
}

export function AnalyticsChart() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [period, setPeriod] = useState("7");
  const [chartType, setChartType] = useState("bar");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { enabledAnalytics } = useSourcePreferences();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  useEffect(() => {
    fetchAnalyticsData();
  }, [period, enabledAnalytics, startDate, endDate]);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const days = parseInt(period);
      const isCustom = Boolean(startDate && endDate);
      const rangeStart = isCustom ? startOfDay(startDate as Date) : (() => { const d = new Date(); d.setDate(d.getDate() - days); return d; })();
      const rangeEnd = isCustom ? endOfDay(endDate as Date) : new Date();

      // Build base query for counting and fetching
      let baseQuery = supabase
        .from('mentions')
        .select('published_at, sentiment, source_name', { count: 'exact' })
        .gte('published_at', rangeStart.toISOString())
        .lte('published_at', rangeEnd.toISOString())
        .order('published_at');

      if (enabledAnalytics.length && enabledAnalytics.length < 4) {
        baseQuery = baseQuery.in('source_type', enabledAnalytics);
      }

      // First, get the count
      const { count, error: countError } = await baseQuery;
      if (countError) throw countError;

      if (!count) {
        setChartData([]);
        setSourceData([]);
        return;
      }

      // Then fetch all data in chunks
      const chunkSize = 1000;
      const chunks = Math.ceil(count / chunkSize);
      let stats: any[] = [];

      for (let i = 0; i < chunks; i++) {
        const { data: chunkData, error: fetchError } = await baseQuery
          .range(i * chunkSize, (i + 1) * chunkSize - 1);
        
        if (fetchError) throw fetchError;
        if (chunkData) {
          stats = [...stats, ...chunkData];
        }
      }

      // Process the combined stats from all chunks

      // Process mentions for time series
      const dailyData = new Map<string, { positive: number; negative: number; neutral: number; total: number }>();
      const sourceCount = new Map<string, number>();

      (stats || []).forEach((mention) => {
        const date = new Date(mention.published_at).toLocaleDateString();
        
        if (!dailyData.has(date)) {
          dailyData.set(date, { positive: 0, negative: 0, neutral: 0, total: 0 });
        }
        
        const dayData = dailyData.get(date)!;
        dayData.total++;
        
        if (mention.sentiment !== null && mention.sentiment !== -1) {
          if (mention.sentiment >= 51) dayData.positive++;
          else if (mention.sentiment === 50) dayData.neutral++;
          else if (mention.sentiment <= 49) dayData.negative++;
        }

        // Aggregate sources
        if (mention.source_name) {
          sourceCount.set(mention.source_name, (sourceCount.get(mention.source_name) || 0) + 1);
        }
      });

      // Convert to chart format
      const chartArray = Array.from(dailyData.entries())
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([date, data]) => ({
          date,
          ...data
        }));

      // Convert sources to pie chart format
      const sourceArray = Array.from(sourceCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value], index) => ({
          name,
          value,
          color: COLORS[index % COLORS.length]
        }));

      setChartData(chartArray);
      setSourceData(sourceArray);
    } catch (error: any) {
      toast({
        title: "Error fetching analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateReportFromAnalytics = async () => {
    toast({ title: "Generating report", description: "Using current analytics filters…" });
    try {
      const days = parseInt(period);
      const isCustom = Boolean(startDate && endDate);
      const rangeStart = isCustom ? startOfDay(startDate as Date) : (() => { const d = new Date(); d.setDate(d.getDate() - days); return d; })();
      const rangeEnd = isCustom ? endOfDay(endDate as Date) : new Date();

      let query = supabase
        .from('mentions')
        .select('sentiment, source_name')
        .gte('published_at', rangeStart.toISOString())
        .lte('published_at', rangeEnd.toISOString());
      if (enabledAnalytics.length && enabledAnalytics.length < 4) {
        query = (query as any).in('source_type', enabledAnalytics as any);
      }
      const { data: mentions, error } = await query;
      if (error) throw error;

      const sourceCounts = new Map<string, number>();
      let total = 0, pos = 0, neg = 0, neu = 0;
      (mentions || []).forEach((m) => {
        total += 1;
        if (m.sentiment !== null && m.sentiment !== -1) {
          if (m.sentiment >= 51) pos += 1;
          else if (m.sentiment === 50) neu += 1;
          else if (m.sentiment <= 49) neg += 1;
        }
        if (m.source_name) sourceCounts.set(m.source_name, (sourceCounts.get(m.source_name) || 0) + 1);
      });
      const topSources = Array.from(sourceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);

      const periodKey = `${format(rangeStart, 'yyyy-MM-dd')}..${format(rangeEnd, 'yyyy-MM-dd')}`;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

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
      toast({ title: 'Report generated', description: 'A report matching this analytics view has been created.' });
    } catch (error: any) {
      toast({ title: 'Error generating report', description: error.message, variant: 'destructive' });
    }
  };

  const totalMentions = chartData.reduce((sum, day) => sum + day.total, 0);
  const avgDaily = totalMentions / (parseInt(period) || 1);

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Analytics Overview</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Detailed insights into your brand mentions</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 items-stretch sm:items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
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

          <Button onClick={async () => { await generateReportFromAnalytics(); }} className="w-full sm:w-auto">
            Export as Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalMentions}</div>
            <p className="text-sm text-muted-foreground">Total Mentions</p>
            <Badge variant="secondary" className="mt-2">
              {startDate && endDate ? `${format(startDate, "PPP")} – ${format(endDate, "PPP")}` : `${period} days`}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{avgDaily.toFixed(1)}</div>
            <p className="text-sm text-muted-foreground">Daily Average</p>
            <Badge variant="outline" className="mt-2">
              Per day
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{sourceData.length}</div>
            <p className="text-sm text-muted-foreground">Active Sources</p>
            <Badge variant="outline" className="mt-2">
              Top sources
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mentions Over Time</CardTitle>
            <CardDescription>
              Sentiment breakdown by day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {chartType === "bar" ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="positive" stackId="a" fill="hsl(var(--success))" />
                  <Bar dataKey="neutral" stackId="a" fill="hsl(var(--muted))" />
                  <Bar dataKey="negative" stackId="a" fill="hsl(var(--destructive))" />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="positive" stroke="hsl(var(--success))" strokeWidth={2} />
                  <Line type="monotone" dataKey="neutral" stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
                  <Line type="monotone" dataKey="negative" stroke="hsl(var(--destructive))" strokeWidth={2} />
                </LineChart>
              )}
            </ResponsiveContainer>
            <div className="mt-4 flex justify-end">
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Sources</CardTitle>
            <CardDescription>
              Distribution of mentions by source
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sourceData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {sourceData.map((source, index) => (
                    <div key={source.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: source.color }}
                        />
                        <span className="text-sm">{source.name}</span>
                      </div>
                      <Badge variant="outline">{source.value}</Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No data available for the selected period
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}