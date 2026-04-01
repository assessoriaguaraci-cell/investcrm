/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { format, eachMonthOfInterval, isSameMonth, parseISO, startOfYear, endOfYear, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PROPERTY_STAGES } from "@/lib/property-constants";
import { useNavigate } from "react-router-dom";
import { TrendingUp, ArrowLeftRight, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const LINE_COLORS = [
  "hsl(202, 99%, 35%)", "hsl(142, 72%, 42%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 50%)",
  "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)", "hsl(340, 75%, 55%)", "hsl(160, 60%, 45%)",
  "hsl(20, 90%, 55%)", "hsl(280, 60%, 50%)", "hsl(80, 70%, 40%)", "hsl(320, 80%, 50%)",
  "hsl(10, 80%, 60%)", "hsl(220, 90%, 60%)", "hsl(60, 90%, 40%)", "hsl(180, 80%, 40%)"
];

interface Props {
  stageHistory: any[];
}

export default function EvolutionChart({ stageHistory }: Props) {
  const navigate = useNavigate();
  const now = new Date();
  
  const [period1, setPeriod1] = useState<DateRange | undefined>({
    from: startOfYear(now),
    to: endOfYear(now)
  });
  
  const [compareMode, setCompareMode] = useState(false);
  const [period2, setPeriod2] = useState<DateRange | undefined>({
    from: startOfYear(subYears(now, 1)),
    to: endOfYear(subYears(now, 1))
  });

  const getChartData = (period: DateRange | undefined) => {
    if (!stageHistory.length || !period?.from) return { data: [], activeStages: [] };
    
    const start = period.from;
    const end = period.to || new Date();
    
    let months: Date[] = [];
    try {
      months = eachMonthOfInterval({ start, end });
    } catch {
      months = [start];
    }

    const data = months.map(m => {
      const monthLabel = format(m, "MMM/yyyy", { locale: ptBR }).toUpperCase();
      const historyInMonth = stageHistory.filter(h => h.entered_at && isSameMonth(parseISO(h.entered_at), m));

      const stageCounts: Record<string, number> = {};
      PROPERTY_STAGES.forEach(s => { stageCounts[s.label] = 0; });
      
      historyInMonth.forEach(h => {
        const stageLabel = PROPERTY_STAGES.find(s => s.value === h.stage)?.label || h.stage;
        stageCounts[stageLabel] = (stageCounts[stageLabel] || 0) + 1;
      });

      return {
        name: monthLabel,
        rawDate: m,
        ...stageCounts,
      };
    });

    const activeStages = new Set<string>();
    data.forEach(month => {
      Object.keys(month).forEach(k => {
        if (k !== 'name' && k !== 'rawDate' && (month as any)[k] > 0) activeStages.add(k);
      });
    });

    return { data, activeStages: Array.from(activeStages) };
  };

  const chart1 = useMemo(() => getChartData(period1), [stageHistory, period1]);
  const chart2 = useMemo(() => getChartData(period2), [stageHistory, period2]);

  const allActiveStages = Array.from(new Set([
    ...chart1.activeStages, 
    ...(compareMode ? chart2.activeStages : [])
  ]));


  const handleDotClick = (data: any, dataKey: string) => {
    if (!data || !data.rawDate) return;
    
    // Debug log to confirm click was captured
    console.log("✅ Drill-down Click captured:", { stage: dataKey, date: data.name });
    
    const stageVal = PROPERTY_STAGES.find((s: any) => s.label === dataKey)?.value || dataKey;
    const historyInMonth = stageHistory.filter((h: any) => 
      h.entered_at && 
      isSameMonth(parseISO(h.entered_at), data.rawDate) && 
      h.stage === stageVal
    );
    
    const propertyIds = historyInMonth.map((h: any) => h.property_id);
    const mName = format(data.rawDate, "MMM/yyyy", { locale: ptBR });
    
    navigate("/properties", { 
      state: { 
        from: "dashboard", 
        filter: "custom_ids", 
        title: `Imóveis em ${dataKey} (${mName})`,
        ids: propertyIds 
      } 
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 border border-border/50 p-3 rounded-lg shadow-xl backdrop-blur-sm pointer-events-none">
          <p className="font-black text-xs uppercase mb-2 border-b border-border/50 pb-1">{label}</p>
          <div className="space-y-1">
            {payload.map((p: any) => (
              <div 
                key={p.dataKey} 
                className="flex items-center gap-2 text-[10px] font-bold py-0.5"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke }} />
                <span className="text-muted-foreground">{p.name}:</span>
                <span className="text-foreground">{p.value}</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground mt-3 font-semibold text-center italic">Clique diretamente na bolinha do gráfico<br/>para listar os imóveis</p>
        </div>
      );
    }
    return null;
  };

  const renderChart = (chartData: any, periodLabel: string) => (
    <div className="flex-1 w-full min-w-[300px] border border-border/40 rounded-xl p-4 bg-muted/5 relative">
      <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] font-black uppercase text-primary border-primary/20 bg-primary/5">
          {periodLabel}
        </Badge>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData.data} margin={{ top: 30, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
          <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
          <YAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} dx={-10} />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '3 3', pointerEvents: 'none' }}
            wrapperStyle={{ pointerEvents: 'none', outline: 'none' }}
            offset={40}
          />
          {!compareMode && <Legend wrapperStyle={{ fontSize: 10, fontWeight: 600, paddingTop: '15px' }} />}
          {allActiveStages.map((stage, i) => (
             <Line 
               key={stage} 
               type="monotone" 
               dataKey={stage} 
               name={stage} 
               stroke={LINE_COLORS[i % LINE_COLORS.length]} 
               strokeWidth={4}
               activeDot={(activeProps: any) => {
                 const { cx, cy, payload } = activeProps;
                 const color = LINE_COLORS[i % LINE_COLORS.length];
                 return (
                   <circle 
                     cx={cx} 
                     cy={cy} 
                     r={12} 
                     fill={color}
                     stroke="#fff"
                     strokeWidth={3}
                     style={{ cursor: 'pointer', pointerEvents: 'all' }}
                     onPointerUp={(e: any) => {
                       e.stopPropagation();
                       handleDotClick(payload, stage);
                     }}
                     onClick={(e: any) => {
                       e.stopPropagation();
                       handleDotClick(payload, stage);
                     }}
                   />
                 );
               }}
               dot={(props: any) => {
                 const { cx, cy, payload, value, key } = props;
                 const color = LINE_COLORS[i % LINE_COLORS.length];
                 if (value === 0 || value === undefined) return <circle key={`empty-${Math.random()}`} />;
                 return (
                   <g 
                     key={`dot-group-${key || Math.random()}`}
                     style={{ cursor: 'pointer', pointerEvents: 'all' }}
                     onPointerUp={(e: any) => {
                       e.stopPropagation();
                       handleDotClick(payload, stage);
                     }}
                     onClick={(e: any) => {
                       e.stopPropagation();
                       handleDotClick(payload, stage);
                     }}
                   >
                     {/* Transparent hit area for easier clicking */}
                     <circle cx={cx} cy={cy} r={20} fill="transparent" />
                     {/* Solid colored visible dot */}
                     <circle 
                       cx={cx} 
                       cy={cy} 
                       r={8} 
                       fill={color} 
                       stroke="#fff" 
                       strokeWidth={2}
                       className="transition-all hover:scale-150 focus:outline-none"
                     />
                   </g>
                 );
               }}
             />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <Card className="col-span-1 md:col-span-2 shadow-sm order-1 md:order-none">
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between flex-wrap gap-4">
        <div>
          <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução Histórica por Etapa
          </CardTitle>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">Comparativo de Imóveis em Linhas</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-muted/30 p-1.5 rounded-lg border border-border/50">
          <div className="flex items-center gap-2 px-2">
            <Switch checked={compareMode} onCheckedChange={setCompareMode} id="compare" />
            <Label htmlFor="compare" className="text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer">
              <ArrowLeftRight className="h-3 w-3" /> Comparativo
            </Label>
          </div>
          
          <div className="h-4 w-px bg-border/80" />
          
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold gap-1 px-2 border-primary/20 bg-primary/5 hover:bg-primary/20">
                  <CalendarIcon className="h-3 w-3" /> 
                  P1: {period1?.from ? format(period1.from, "yyyy") : "Ano Atual"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="end">
                <DateRangePicker date={period1} onDateChange={setPeriod1} />
              </PopoverContent>
            </Popover>

            {compareMode && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold gap-1 px-2 border-primary/20 bg-primary/5 hover:bg-primary/20">
                    <CalendarIcon className="h-3 w-3" /> 
                    P2: {period2?.from ? format(period2.from, "yyyy") : "Ano Anterior"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="end">
                  <DateRangePicker date={period2} onDateChange={setPeriod2} />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 relative">
        {chart1.data.length > 0 ? (
          <div className="space-y-4">
            <div className={`flex flex-col ${compareMode ? 'lg:flex-row' : ''} gap-4 w-full justify-between items-stretch`}>
              {renderChart(chart1, period1?.from && period1?.to ? `${format(period1.from, "MMM/yyyy", {locale: ptBR})} - ${format(period1.to, "MMM/yyyy", {locale: ptBR})}` : "Período 1")}
              {compareMode && renderChart(chart2, period2?.from && period2?.to ? `${format(period2.from, "MMM/yyyy", {locale: ptBR})} - ${format(period2.to, "MMM/yyyy", {locale: ptBR})}` : "Período 2")}
            </div>
            
            {compareMode && (
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 px-4 py-3 bg-muted/20 border border-border/50 rounded-lg">
                <span className="text-[10px] font-black uppercase text-muted-foreground w-full text-center mb-1">Legenda Compartilhada</span>
                {allActiveStages.map((stage, i) => (
                  <div key={stage} className="flex items-center gap-1.5 text-[10px] font-bold">
                    <div className="w-4 h-1.5 rounded-full" style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }} />
                    <span className="text-foreground uppercase tracking-wider">{stage}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-12 text-center">Nenhum histórico encontrado no período selecionado.</p>
        )}
      </CardContent>
    </Card>
  );
}
