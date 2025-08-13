import { jsPDF } from "jspdf";
import { format, parse, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface ReportPdfData {
  report_month: string; // yyyy-MM or yyyy-MM-dd..yyyy-MM-dd
  total_mentions: number;
  positives: number;
  negatives: number;
  neutrals: number;
  top_sources: string[];
  created_at?: string;
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

function drawLineChart(doc: jsPDF, opts: { x: number; y: number; width: number; height: number; data: { date: string; positive: number; neutral: number; negative: number }[] }) {
  const { x, y, width, height, data } = opts;
  // Border
  doc.setDrawColor(200);
  doc.rect(x, y, width, height);

  if (!data.length) {
    doc.setTextColor(120);
    doc.setFontSize(10);
    doc.text('No data for this period', x + width / 2, y + height / 2, { align: 'center' });
    doc.setTextColor(0);
    return;
  }

  // Determine scale
  const series = ['positive', 'neutral', 'negative'] as const;
  const maxY = Math.max(1, ...data.flatMap(d => series.map(s => (d as any)[s] as number)));
  const leftPad = 32;
  const bottomPad = 24;
  const chartX = x + leftPad;
  const chartY = y + 8;
  const chartW = width - leftPad - 8;
  const chartH = height - bottomPad - 8;

  // Axes
  doc.setDrawColor(160);
  doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH); // x-axis
  doc.line(chartX, chartY, chartX, chartY + chartH); // y-axis

  // Y ticks (0, max)
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('0', chartX - 8, chartY + chartH, { align: 'right' });
  doc.text(String(maxY), chartX - 8, chartY + 8, { align: 'right' });
  doc.setTextColor(0);

  // X mapping
  const n = data.length;
  const dx = n > 1 ? chartW / (n - 1) : 0;
  const xFor = (i: number) => chartX + i * dx;
  const yFor = (val: number) => chartY + chartH - (val / maxY) * chartH;

  // Helper to draw one series
  const drawSeries = (key: 'positive' | 'neutral' | 'negative', color: [number, number, number]) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(1.2);
    for (let i = 1; i < n; i++) {
      const x1 = xFor(i - 1);
      const y1 = yFor((data[i - 1] as any)[key]);
      const x2 = xFor(i);
      const y2 = yFor((data[i] as any)[key]);
      doc.line(x1, y1, x2, y2);
    }
  };

  drawSeries('positive', [30, 160, 90]);   // green
  drawSeries('neutral', [120, 120, 120]);  // gray
  drawSeries('negative', [220, 70, 70]);   // red

  // X labels (first, mid, last)
  const first = data[0]?.date;
  const mid = data[Math.floor(n / 2)]?.date;
  const last = data[n - 1]?.date;
  doc.setFontSize(9);
  doc.setTextColor(120);
  if (first) doc.text(first, chartX, chartY + chartH + 14, { align: 'left' });
  if (mid) doc.text(mid, chartX + chartW / 2, chartY + chartH + 14, { align: 'center' });
  if (last) doc.text(last, chartX + chartW, chartY + chartH + 14, { align: 'right' });
  doc.setTextColor(0);

  // Legend
  const legendY = y + 4;
  const items: [string, [number, number, number]][] = [
    ['Positive', [30, 160, 90]],
    ['Neutral', [120, 120, 120]],
    ['Negative', [220, 70, 70]],
  ];
  doc.setFontSize(9);
  let lx = x + width - 140;
  items.forEach(([label, color]) => {
    doc.setDrawColor(...color);
    doc.line(lx, legendY, lx + 14, legendY);
    doc.setTextColor(60);
    doc.text(label, lx + 18, legendY + 3);
    lx += 60;
  });
  doc.setTextColor(0);
}

function drawPieChart(doc: jsPDF, opts: { x: number; y: number; r: number; data: { name: string; value: number; color: [number, number, number] }[] }) {
  const { x, y, r, data } = opts;
  const total = data.reduce((s, d) => s + d.value, 0);
  
  if (!total) {
    doc.setTextColor(120);
    doc.setFontSize(10);
    doc.text('No source data', x, y, { align: 'center' });
    doc.setTextColor(0);
    return;
  }

  let startAngle = -Math.PI / 2;
  data.forEach((slice) => {
    const angle = (slice.value / total) * Math.PI * 2;
    const steps = Math.max(12, Math.floor(angle / (Math.PI / 36))); // More precise steps
    
    // Start from center
    const points = [[x, y]];
    
    // Add arc points
    for (let i = 0; i <= steps; i++) {
      const currentAngle = startAngle + (angle * i) / steps;
      points.push([
        x + Math.cos(currentAngle) * r,
        y + Math.sin(currentAngle) * r
      ]);
    }
    
    // Close back to center
    points.push([x, y]);
    
    // Draw filled polygon
    doc.setFillColor(...slice.color);
    doc.setDrawColor(...slice.color);
    
    const lines = points.map((point, i) => {
      if (i === 0) return null;
      const [px, py] = point;
      const [prevX, prevY] = points[i - 1];
      return [px - prevX, py - prevY];
    }).filter(Boolean) as number[][];
    
    doc.lines(lines, points[0][0], points[0][1], [1, 1], 'F', true);
    
    startAngle += angle;
  });
}

export async function downloadReportPdf(report: ReportPdfData, filterSources?: string[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  let y = margin;

  let periodText = report.report_month;
  if (/^\d{4}-\d{2}$/.test(report.report_month)) {
    const monthDate = parse(`${report.report_month}-01`, 'yyyy-MM-dd', new Date());
    periodText = format(monthDate, 'LLLL yyyy');
  } else if (/^\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}$/.test(report.report_month)) {
    const [s, e] = report.report_month.split('..');
    const sd = parse(s, 'yyyy-MM-dd', new Date());
    const ed = parse(e, 'yyyy-MM-dd', new Date());
    periodText = `${format(sd, 'PPP')} – ${format(ed, 'PPP')}`;
  }

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`Brand Monitoring Report`, margin, y);
  y += 24;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`Period: ${periodText}`, margin, y);
  y += 18;
  if (report.created_at) {
    const created = format(new Date(report.created_at), 'PPP');
    doc.text(`Generated on: ${created}`, margin, y);
    y += 18;
  }

  // Divider
  doc.setDrawColor(180);
  doc.line(margin, y, 595 - margin, y);
  y += 24;

  // Metrics
  doc.setFont('helvetica', 'bold');
  doc.text('Key Metrics', margin, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Mentions: ${report.total_mentions}`, margin, y);
  y += 16;
  doc.text(`Positive: ${report.positives}`, margin, y);
  y += 16;
  doc.text(`Neutral: ${report.neutrals}`, margin, y);
  y += 16;
  doc.text(`Negative: ${report.negatives}`, margin, y);
  y += 24;

  // Simple bars visualization
  const maxVal = Math.max(1, report.total_mentions);
  const barWidthMax = 300;
  const barHeight = 12;

  const drawBar = (label: string, value: number, offset: number) => {
    const width = Math.max(1, (value / maxVal) * barWidthMax);
    doc.setFillColor(60 + offset, 130, 200 - offset);
    doc.rect(margin, y, width, barHeight, 'F');
    doc.text(`${label}: ${value}`, margin + barWidthMax + 12, y + barHeight - 2);
    y += barHeight + 8;
  };

  doc.setFont('helvetica', 'bold');
  doc.text('Distribution', margin, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  drawBar('Positive', report.positives, 0);
  drawBar('Neutral', report.neutrals, 40);
  drawBar('Negative', report.negatives, 80);
  y += 16;

  // Mentions over time (line chart)
  doc.setFont('helvetica', 'bold');
  doc.text('Mentions Over Time', margin, y);
  y += 12;

  try {
    // Fetch detailed mentions for charts
    const { start, end } = getRangeFromKey(report.report_month);
    let query = supabase
      .from('mentions')
      .select('published_at, sentiment, source_name, source_type')
      .gte('published_at', start.toISOString())
      .lte('published_at', end.toISOString())
      .order('published_at');
    if (filterSources && filterSources.length && filterSources.length < 4) {
      query = (query as any).in('source_type', filterSources as any);
    }
    const { data: details } = await query as any;

    const daily = new Map<string, { positive: number; neutral: number; negative: number }>();
    const sources = new Map<string, number>();
    (details || []).forEach((m: any) => {
      const d = new Date(m.published_at).toLocaleDateString();
      if (!daily.has(d)) daily.set(d, { positive: 0, neutral: 0, negative: 0 });
      const bucket = daily.get(d)!;
      if (m.sentiment === 'positive') bucket.positive += 1;
      else if (m.sentiment === 'negative') bucket.negative += 1;
      else bucket.neutral += 1;
      if (m.source_name) sources.set(m.source_name, (sources.get(m.source_name) || 0) + 1);
    });
    const lineData = Array.from(daily.entries()).map(([date, vals]) => ({ date, ...vals }));
    lineData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    drawLineChart(doc, { x: margin, y, width: 500, height: 170, data: lineData });
    y += 190;

    // Top Sources (pie chart)
    doc.setFont('helvetica', 'bold');
    doc.text('Top Sources', margin, y);
    y += 12;

    const COLORS: [number, number, number][] = [
      [66, 133, 244], // blue
      [52, 168, 83],  // green
      [251, 188, 5],  // yellow
      [234, 67, 53],  // red
      [156, 39, 176], // purple
    ];
    const sourceArr = Array.from(sources.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));

    drawPieChart(doc, { x: margin + 90, y: y + 80, r: 60, data: sourceArr });

    // Legend
    let ly = y + 10;
    doc.setFont('helvetica', 'normal');
    sourceArr.forEach((s) => {
      doc.setFillColor(...s.color);
      doc.rect(margin + 200, ly - 8, 10, 10, 'F');
      doc.setTextColor(60);
      doc.text(`${s.name} (${s.value})`, margin + 220, ly);
      doc.setTextColor(0);
      ly += 16;
    });
    y += 170;
  } catch (e) {
    // If chart drawing fails for any reason, continue with PDF generation
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text('Charts unavailable for this report.', margin, y);
    doc.setTextColor(0);
    y += 24;
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('Generated by your Brand Monitoring Dashboard', margin, pageHeight - 24);

  doc.save(`brand-report-${report.report_month}.pdf`);
}

