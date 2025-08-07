import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  useEffect(() => {
    fetchAnalyticsData();
  }, [period]);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("mentions")
        .select("published_at, sentiment, source_name")
        .gte("published_at", startDate.toISOString())
        .order("published_at");

      if (error) throw error;

      // Process data for time series
      const dailyData = new Map<string, { positive: number; negative: number; neutral: number; total: number }>();
      const sourceCount = new Map<string, number>();

      data?.forEach((mention) => {
        const date = new Date(mention.published_at).toLocaleDateString();
        
        if (!dailyData.has(date)) {
          dailyData.set(date, { positive: 0, negative: 0, neutral: 0, total: 0 });
        }
        
        const dayData = dailyData.get(date)!;
        dayData.total++;
        
        if (mention.sentiment === "positive") dayData.positive++;
        else if (mention.sentiment === "negative") dayData.negative++;
        else dayData.neutral++;

        // Count sources
        sourceCount.set(mention.source_name, (sourceCount.get(mention.source_name) || 0) + 1);
      });

      // Convert to chart format
      const chartArray = Array.from(dailyData.entries()).map(([date, data]) => ({
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
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
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
          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Bar Chart</SelectItem>
              <SelectItem value="line">Line Chart</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalMentions}</div>
            <p className="text-sm text-muted-foreground">Total Mentions</p>
            <Badge variant="secondary" className="mt-2">
              {period} days
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