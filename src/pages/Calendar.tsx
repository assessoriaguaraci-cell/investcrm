import { useState, useEffect } from "react";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    RefreshCw,
    CalendarDays,
    CalendarRange,
    CalendarFold,
    Clock,
    ArrowRight
} from "lucide-react";
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addDays,
    subDays,
    startOfYear,
    endOfYear,
    eachMonthOfInterval,
    startOfDay,
    endOfDay,
    eachHourOfInterval,
    addWeeks,
    subWeeks,
    addYears,
    subYears
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type CalendarView = "month" | "week" | "day" | "year";

export default function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeView, setActiveView] = useState<CalendarView>("month");
    const [googleConnected, setGoogleConnected] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        checkGoogleConnection();
    }, []);

    const checkGoogleConnection = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.provider_token || session?.user?.app_metadata?.provider === 'google') {
            setGoogleConnected(true);
        }
    };

    const handleConnectGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
                redirectTo: window.location.origin + '/calendar'
            }
        });

        if (error) {
            toast({
                title: "Erro ao conectar",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const navigateDate = (direction: 'next' | 'prev') => {
        if (activeView === 'month') {
            setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
        } else if (activeView === 'week') {
            setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
        } else if (activeView === 'day') {
            setCurrentDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
        } else if (activeView === 'year') {
            setCurrentDate(prev => direction === 'next' ? addYears(prev, 1) : subYears(prev, 1));
        }
    };

    const getHeaderDate = () => {
        if (activeView === 'year') return format(currentDate, 'yyyy');
        if (activeView === 'month') return format(currentDate, 'MMMM yyyy', { locale: ptBR });
        if (activeView === 'week') {
            const start = startOfWeek(currentDate, { locale: ptBR });
            const end = endOfWeek(currentDate, { locale: ptBR });
            return `${format(start, 'dd MMM')} - ${format(end, 'dd MMM yyyy', { locale: ptBR })}`;
        }
        return format(currentDate, 'dd [de] MMMM [de] yyyy', { locale: ptBR });
    };

    return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4 border-b border-border/50 pb-4 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-primary shrink-0" />
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl md:text-2xl font-black text-foreground uppercase tracking-tighter leading-none font-heading">
                Agenda / Calendário
              </h1>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider font-body">Eventos e Compromissos Google</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!googleConnected ? (
              <Button variant="ghost" size="sm" onClick={handleConnectGoogle} className="gap-2 h-9 border border-border/20 shadow-sm text-foreground hover:bg-muted font-bold text-xs uppercase">
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                  Conectar Google
              </Button>
          ) : (
              <Badge className="gap-1.5 py-1.5 px-3 bg-green-500/10 text-green-600 border border-green-200 font-bold text-[10px] uppercase">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Google Sincronizado
              </Badge>
          )}
          <Button className="gap-2 font-black shadow-sm h-9 px-4 uppercase text-xs">
              <Plus className="h-4 w-4" />
              Novo Evento
          </Button>
        </div>
      </div>

            <Card className="flex-1 flex flex-col min-h-0 border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="p-4 border-b bg-muted/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" className="min-w-[140px] font-semibold capitalize" onClick={() => setCurrentDate(new Date())}>
                                {getHeaderDate()}
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as CalendarView)} className="w-auto">
                            <TabsList className="grid grid-cols-4 w-[320px]">
                                <TabsTrigger value="year" className="text-xs">Ano</TabsTrigger>
                                <TabsTrigger value="month" className="text-xs">Mês</TabsTrigger>
                                <TabsTrigger value="week" className="text-xs">Semana</TabsTrigger>
                                <TabsTrigger value="day" className="text-xs">Dia</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>

                <CardContent className="p-0 flex-1 overflow-hidden bg-background/30">
                    <ScrollArea className="h-full">
                        {activeView === "month" && <MonthView currentDate={currentDate} />}
                        {activeView === "week" && <WeekView currentDate={currentDate} />}
                        {activeView === "day" && <DayView currentDate={currentDate} />}
                        {activeView === "year" && <YearView currentDate={currentDate} />}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

function MonthView({ currentDate }: { currentDate: Date }) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: ptBR });
    const endDate = endOfWeek(monthEnd, { locale: ptBR });

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    return (
        <div className="flex flex-col h-full min-w-[700px]">
            <div className="grid grid-cols-7 border-b bg-muted/40">
                {weekDays.map(day => (
                    <div key={day} className="py-2.5 text-center text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 flex-1">
                {days.map((day, i) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                "min-h-[140px] p-2 border-r border-b transition-all relative group",
                                !isCurrentMonth ? "bg-muted/5 text-muted-foreground/30" : "bg-background/40",
                                "hover:bg-primary/5 active:bg-primary/10 cursor-pointer"
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={cn(
                                    "text-sm font-bold w-8 h-8 flex items-center justify-center rounded-xl transition-all shadow-sm",
                                    isToday ? "bg-primary text-primary-foreground scale-110" : "text-foreground/70 group-hover:bg-primary/10 group-hover:text-primary"
                                )}>
                                    {format(day, 'd')}
                                </span>
                                {isToday && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />}
                            </div>
                            <div className="space-y-1.5 mt-1">
                                {/* Simulated Events */}
                                {isToday && (
                                    <div className="text-[10px] p-1.5 rounded-lg bg-blue-500/10 text-blue-600 border-l-2 border-blue-500 truncate font-semibold shadow-sm">
                                        Reunião de Venda
                                    </div>
                                )}
                                {isCurrentMonth && Math.random() > 0.85 && (
                                    <div className="text-[10px] p-1.5 rounded-lg bg-amber-500/10 text-amber-600 border-l-2 border-amber-500 truncate font-semibold shadow-sm">
                                        Visita Técnica
                                    </div>
                                )}
                            </div>
                            <button className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-xl bg-primary text-primary-foreground shadow-lg hover:scale-110">
                                <Plus className="h-3 w-3" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function WeekView({ currentDate }: { currentDate: Date }) {
    const startDate = startOfWeek(currentDate, { locale: ptBR });
    const days = eachDayOfInterval({
        start: startDate,
        end: addDays(startDate, 6)
    });

    const hours = eachHourOfInterval({
        start: startOfDay(currentDate),
        end: endOfDay(currentDate)
    });

    return (
        <div className="flex flex-col h-full min-w-[800px]">
            <div className="grid grid-cols-[80px_1fr] border-b bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
                <div className="bg-muted/10 border-r" />
                <div className="grid grid-cols-7">
                    {days.map(day => (
                        <div key={day.toString()} className={cn(
                            "py-4 text-center border-r flex flex-col items-center gap-2",
                            isSameDay(day, new Date()) ? "bg-primary/5" : ""
                        )}>
                            <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">{format(day, 'EEE', { locale: ptBR })}</span>
                            <span className={cn(
                                "text-xl font-black w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm",
                                isSameDay(day, new Date()) ? "bg-primary text-primary-foreground scale-110 shadow-lg" : "text-foreground group-hover:text-primary"
                            )}>{format(day, 'd')}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-[80px_1fr] flex-1">
                <div className="bg-muted/5 border-r">
                    {hours.map(hour => (
                        <div key={hour.toString()} className="h-24 border-b text-[11px] text-muted-foreground/70 flex items-start justify-center pt-3 font-bold tracking-tighter">
                            {format(hour, 'HH:mm')}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 relative">
                    {days.map(day => (
                        <div key={day.toString()} className="border-r relative">
                            {hours.map(hour => (
                                <div key={hour.toString()} className="h-24 border-b border-muted/20 hover:bg-primary/5 transition-colors cursor-pointer group" />
                            ))}
                            {/* Simulated Event */}
                            {isSameDay(day, new Date()) && (
                                <div className="absolute top-[820px] left-1 right-1 h-36 bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 border-l-4 border-indigo-500 rounded-xl p-3 overflow-hidden shadow-md group cursor-pointer hover:scale-[1.02] transition-all z-20 hover:from-indigo-500/20">
                                    <p className="text-[10px] font-black text-indigo-600 flex items-center gap-1 uppercase tracking-wider">
                                        <Clock className="w-3.5 h-3.5" /> 10:00 - 11:30
                                    </p>
                                    <p className="text-sm font-bold mt-1.5 truncate text-indigo-900 dark:text-indigo-100">Feedback Negociação</p>
                                    <p className="text-[11px] text-indigo-600/80 mt-1 line-clamp-2 font-medium">Conversa sobre o imóvel de luxo no Centro.</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function DayView({ currentDate }: { currentDate: Date }) {
    const hours = eachHourOfInterval({
        start: startOfDay(currentDate),
        end: endOfDay(currentDate)
    });

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto py-10 px-6">
            <div className="flex items-center gap-6 mb-12">
                <div className="flex flex-col items-center justify-center bg-primary/10 rounded-2xl p-6 min-w-[120px] border border-primary/20 shadow-inner">
                    <span className="text-xs font-black text-primary uppercase tracking-widest mb-1">{format(currentDate, 'EEEE', { locale: ptBR })}</span>
                    <span className="text-5xl font-black text-primary leading-none">{format(currentDate, 'd')}</span>
                </div>
                <div>
                    <h2 className="text-3xl font-black tracking-tight capitalize text-foreground">{format(currentDate, 'MMMM', { locale: ptBR })}</h2>
                    <p className="text-lg text-muted-foreground font-medium flex items-center gap-2">
                        <span className="w-8 h-px bg-muted-foreground/30" />
                        {format(currentDate, 'yyyy')}
                    </p>
                </div>
            </div>

            <div className="relative space-y-1">
                {hours.map(hour => (
                    <div key={hour.toString()} className="flex items-start gap-6 group">
                        <span className="text-[11px] font-black text-muted-foreground/60 w-14 pt-1 transition-colors group-hover:text-primary">{format(hour, 'HH:mm')}</span>
                        <div className="flex-1 min-h-[70px] border-t border-dashed border-muted/40 relative hover:bg-primary/5 transition-all cursor-pointer rounded-xl group-hover:border-primary/40 group-hover:translate-x-1">
                            {/* Marker for current hour */}
                            {isSameDay(currentDate, new Date()) && format(hour, 'HH') === format(new Date(), 'HH') && (
                                <div className="absolute -left-3 top-0 w-3 h-3 rounded-full bg-red-500 animate-ping -translate-y-1/2 shadow-lg" />
                            )}
                        </div>
                    </div>
                ))}

                {/* Floating Event example */}
                {isSameDay(currentDate, new Date()) && (
                    <div className="absolute top-[620px] left-20 right-0 bg-gradient-to-br from-primary to-primary-foreground/10 text-primary-foreground rounded-2xl p-6 shadow-2xl border border-white/20 transform transition-all hover:scale-[1.02] cursor-pointer group">
                        <div className="flex justify-between items-start mb-3">
                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-none py-1.5 px-4 rounded-full font-bold">
                                <Clock className="w-3.5 h-3.5 mr-2" /> 10:00 - 11:30
                            </Badge>
                            <div className="flex gap-2">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20 rounded-full">
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20 rounded-full">
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <h3 className="font-black text-2xl tracking-tight leading-none mb-2">Visita ao Apartamento Lux</h3>
                        <p className="text-sm text-white/90 font-medium opacity-80 mt-2">Av. Paulista, 1000 - São Paulo, SP</p>
                        <div className="flex items-center gap-3 mt-6">
                            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-sm font-black border border-white/20 shadow-lg">JD</div>
                            <div className="flex flex-col">
                                <span className="text-xs font-black tracking-wider uppercase opacity-60">Cliente Premium</span>
                                <span className="text-sm font-bold">João Dono do Imóvel</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function YearView({ currentDate }: { currentDate: Date }) {
    const yearStart = startOfYear(currentDate);
    const months = eachMonthOfInterval({
        start: yearStart,
        end: endOfYear(yearStart)
    });

    return (
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {months.map(month => (
                <Card key={month.toString()} className="overflow-hidden border-none bg-background/50 backdrop-blur-md hover:bg-background transition-all shadow-md hover:shadow-2xl group rounded-2xl">
                    <CardHeader className="p-4 bg-muted/20 border-b group-hover:bg-primary/5 transition-colors">
                        <CardTitle className="text-xs font-black text-center uppercase tracking-[0.2em] text-muted-foreground/80 group-hover:text-primary transition-colors">
                            {format(month, 'MMMM', { locale: ptBR })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-7 gap-1.5">
                            {["D", "S", "T", "Q", "Q", "S", "S"].map(d => (
                                <span key={d} className="text-[10px] font-black text-center text-muted-foreground/30 py-1.5">{d}</span>
                            ))}
                            {eachDayOfInterval({
                                start: startOfWeek(startOfMonth(month)),
                                end: endOfWeek(endOfMonth(month))
                            }).map(day => (
                                <span
                                    key={day.toString()}
                                    className={cn(
                                        "text-[10px] text-center p-1.5 rounded-lg transition-all",
                                        !isSameMonth(day, month) ? "text-muted-foreground/10" : "",
                                        isSameDay(day, new Date()) ? "bg-primary text-primary-foreground font-black scale-110 shadow-md" : "text-foreground/70",
                                        isSameMonth(day, month) && "hover:bg-primary/10 hover:text-primary cursor-pointer font-bold"
                                    )}
                                >
                                    {format(day, 'd')}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
