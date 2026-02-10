import { Building2, Users, Link2, CheckSquare, Plus, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const kpiData = [
  { label: "Imóveis Ativos", value: "0", icon: Building2, color: "text-primary" },
  { label: "Leads Ativos", value: "0", icon: Users, color: "text-info" },
  { label: "Vendas do Mês", value: "R$ 0", icon: TrendingUp, color: "text-success" },
  { label: "Pendências", value: "0", icon: AlertTriangle, color: "text-warning" },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do CRM</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => navigate("/properties")}
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <span className="font-medium">Novo Imóvel</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => navigate("/clients")}
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-info/10">
            <Plus className="h-5 w-5 text-info" />
          </div>
          <span className="font-medium">Novo Cliente</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => navigate("/matches")}
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-success/10">
            <Link2 className="h-5 w-5 text-success" />
          </div>
          <span className="font-medium">Vincular Cliente ↔ Imóvel</span>
        </Button>
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Imóveis por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Dados carregarão quando houver imóveis cadastrados.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
