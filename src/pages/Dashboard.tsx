import { useMemo } from "react";
import { Building2, Users, Link2, TrendingUp, AlertTriangle, Plus, Clock, CalendarDays, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useProperties } from "@/hooks/useProperties";
import { useClients } from "@/hooks/useClients";
import { useActivities } from "@/hooks/useActivities";
import { useClientPropertyLinks } from "@/hooks/useClientPropertyLinks";
import { PROPERTY_STAGES, formatCurrency, totalInvestment } from "@/lib/property-constants";
import { TEMPERATURE_OPTIONS } from "@/lib/client-constants";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, isAfter, isBefore, startOfMonth, endOfMonth, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const PIE_COLORS = [
  "hsl(200, 98%, 39%)",
  "hsl(142, 72%, 42%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 50%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
  "hsl(340, 75%, 55%)",
  "hsl(160, 60%, 45%)",
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: properties = [], isLoading: loadingProps } = useProperties();
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const { data: activities = [], isLoading: loadingActivities } = useActivities();
  const { data: links = [] } = useClientPropertyLinks();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const stats = useMemo(() => {
    const activeProperties = properties.filter(p => p.stage !== "finalizado");
    const activeClients = clients.filter(c => c.stage !== "venda_concretizada" && c.stage !== "venda_cancelada" && c.stage !== "credito_reprovado");

    const salesThisMonth = properties.filter(p => {
      if (!p.sale_date) return false;
      const d = parseISO(p.sale_date);
      return isAfter(d, monthStart) && isBefore(d, monthEnd);
    });
    const salesRevenue = salesThisMonth.reduce((sum, p) => sum + (p.final_sale_price || 0), 0);

    const pendingActivities = activities.filter(a => a.status === "pendente");
    const overdueActivities = activities.filter(a => {
      if (a.status !== "pendente" || !a.due_date) return false;
      return isBefore(parseISO(a.due_date), now);
    });

    return { activeProperties: activeProperties.length, activeClients: activeClients.length, salesRevenue, salesCount: salesThisMonth.length, pendingActivities: pendingActivities.length, overdueActivities: overdueActivities.length };
  }, [properties, clients, activities]);

  // Properties by stage chart
  const stageChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    properties.forEach(p => { counts[p.stage] = (counts[p.stage] || 0) + 1; });
    return PROPERTY_STAGES.filter(s => counts[s.value]).map(s => ({ name: s.label, value: counts[s.value] || 0 }));
  }, [properties]);

  // Leads by temperature
  const tempChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    clients.forEach(c => { counts[c.temperature] = (counts[c.temperature] || 0) + 1; });
    return TEMPERATURE_OPTIONS.map(t => ({ name: t.label, value: counts[t.value] || 0 })).filter(d => d.value > 0);
  }, [clients]);

  // Recent activities (last 10)
  const recentActivities = useMemo(() => {
    return activities
      .filter(a => a.status === "pendente")
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      })
      .slice(0, 6);
  }, [activities]);

  // Portfolio value
  const portfolioValue = useMemo(() => {
    return properties
      .filter(p => p.stage !== "finalizado")
      .reduce((sum, p) => sum + (p.listed_price || p.purchase_price || 0), 0);
  }, [properties]);

  const isLoading = loadingProps || loadingClients || loadingActivities;

  const kpis = [
    { label: "Imóveis Ativos", value: stats.activeProperties.toString(), icon: Building2, color: "text-primary", bgColor: "bg-primary/10", onClick: () => navigate("/properties", { state: { from: "dashboard", filter: "active" } }) },
    { label: "Leads Ativos", value: stats.activeClients.toString(), icon: Users, color: "text-info", bgColor: "bg-info/10", onClick: () => navigate("/clients", { state: { from: "dashboard", filter: "active" } }) },
    { label: "Vendas do Mês", value: stats.salesCount > 0 ? formatCurrency(stats.salesRevenue) : "0", subtitle: stats.salesCount > 0 ? `${stats.salesCount} venda${stats.salesCount > 1 ? "s" : ""}` : undefined, icon: TrendingUp, color: "text-success", bgColor: "bg-success/10", onClick: () => navigate("/properties", { state: { from: "dashboard", filter: "sales_this_month" } }) },
    { label: "Pendências", value: stats.pendingActivities.toString(), subtitle: stats.overdueActivities > 0 ? `${stats.overdueActivities} atrasada${stats.overdueActivities > 1 ? "s" : ""}` : undefined, icon: AlertTriangle, color: stats.overdueActivities > 0 ? "text-destructive" : "text-warning", bgColor: stats.overdueActivities > 0 ? "bg-destructive/10" : "bg-warning/10", onClick: () => navigate("/tasks", { state: { from: "dashboard", filter: "pending" } }) },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do CRM — {format(now, "dd 'de' MMMM, yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow cursor-pointer" onClick={kpi.onClick}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">{isLoading ? "..." : kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                {kpi.subtitle && (
                  <p className={`text-xs mt-0.5 font-medium ${kpi.color}`}>{kpi.subtitle}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Portfolio value bar */}
      {portfolioValue > 0 && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor Total do Portfólio</p>
              <p className="text-xl font-bold">{formatCurrency(portfolioValue)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Vínculos Ativos</p>
              <p className="text-xl font-bold">{links.filter(l => l.status !== "recusou" && l.status !== "fechado").length}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              Imóveis por Etapa
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/properties")}>
                Ver todos <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stageChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stageChartData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(200, 98%, 39%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum imóvel cadastrado ainda.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              Leads por Temperatura
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/clients")}>
                Ver todos <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tempChartData.length > 0 ? (
              <div className="flex items-center justify-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={tempChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                      {tempChartData.map((_, i) => (
                        <Cell key={i} fill={["hsl(199, 89%, 48%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 50%)"][i] || PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {tempChartData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: ["hsl(199, 89%, 48%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 50%)"][i] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum lead cadastrado ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activities + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Upcoming Activities */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Próximas Atividades
              </span>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/tasks")}>
                Ver todas <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-2">
                {recentActivities.map((act) => {
                  const isOverdue = act.due_date && isBefore(parseISO(act.due_date), now);
                  const daysLeft = act.due_date ? differenceInDays(parseISO(act.due_date), now) : null;
                  return (
                    <div key={act.id} className="flex items-start gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${isOverdue ? "bg-destructive" : "bg-warning"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{act.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {act.properties && <span>{(act.properties as any).code}</span>}
                          {act.responsible_profile && <span>• {(act.responsible_profile as any).full_name}</span>}
                        </div>
                      </div>
                      {act.due_date && (
                        <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-xs shrink-0">
                          <CalendarDays className="h-3 w-3 mr-1" />
                          {isOverdue ? `${Math.abs(daysLeft!)}d atrás` : daysLeft === 0 ? "Hoje" : `${daysLeft}d`}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma atividade pendente.</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-11"
              onClick={() => navigate("/properties")}
            >
              <div className="flex items-center justify-center h-7 w-7 rounded-md bg-primary/10">
                <Plus className="h-3.5 w-3.5 text-primary" />
              </div>
              Novo Imóvel
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-11"
              onClick={() => navigate("/clients")}
            >
              <div className="flex items-center justify-center h-7 w-7 rounded-md bg-info/10">
                <Plus className="h-3.5 w-3.5 text-info" />
              </div>
              Novo Cliente
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-11"
              onClick={() => navigate("/matches")}
            >
              <div className="flex items-center justify-center h-7 w-7 rounded-md bg-success/10">
                <Link2 className="h-3.5 w-3.5 text-success" />
              </div>
              Vincular Cliente ↔ Imóvel
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-11"
              onClick={() => navigate("/tasks")}
            >
              <div className="flex items-center justify-center h-7 w-7 rounded-md bg-warning/10">
                <Clock className="h-3.5 w-3.5 text-warning" />
              </div>
              Nova Tarefa
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
