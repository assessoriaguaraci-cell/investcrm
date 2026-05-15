import { useState } from "react";
import { ClipboardCopy, FileText, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePropertyChecklist } from "@/hooks/usePropertyChecklist";
import { usePropertyUpdates } from "@/hooks/usePropertyUpdates";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROPERTY_STAGES } from "@/lib/property-constants";
import { getTemplatesForStage } from "@/lib/checklist-templates";
import { differenceInDays, format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  property: any;
  mode?: "property" | "pre_auction";
}

export default function PropertyReportGenerator({ property, mode = "property" }: Props) {
  const { data: checklistItems, isLoading: loadingChecklist } = usePropertyChecklist(property.id);
  const { data: updates, isLoading: loadingUpdates } = usePropertyUpdates(property.id);
  const [report, setReport] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: approvedClients, isLoading: loadingClients } = useQuery({
    queryKey: ["approved-clients-for-property", property.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_property_links")
        .select("*, clients(full_name, phone, whatsapp, stage)")
        .eq("property_id", property.id);
      if (error) throw error;
      return (data ?? []).filter(
        (link: any) => link.clients?.stage === "credito_aprovado" || link.clients?.stage === "credito_aprovado_pipe"
      );
    },
  });

  const isLoading = loadingChecklist || loadingUpdates || loadingClients;
  const stageLabel = PROPERTY_STAGES.find(s => s.value === property.stage)?.label ?? property.stage;
  const daysSinceAuction = property.auction_date
    ? differenceInDays(new Date(), new Date(property.auction_date + "T12:00:00"))
    : null;

  const ensureAllChecklists = async () => {
    const stageOrder = PROPERTY_STAGES.map(s => s.value);
    const currentIdx = stageOrder.indexOf(property.stage);
    for (let i = 0; i <= currentIdx; i++) {
      const stage = stageOrder[i] as any;
      const { data: existing } = await supabase
        .from("property_checklist_items")
        .select("id")
        .eq("property_id", property.id)
        .eq("stage", stage)
        .limit(1);
      if (!existing || existing.length === 0) {
        const templates = getTemplatesForStage(stage);
        if (templates.length > 0) {
          const rows = templates.map(t => ({
            property_id: property.id,
            stage: t.stage,
            group_name: t.group,
            task_name: t.task,
            sort_order: t.sort,
          }));
          await supabase.from("property_checklist_items").insert(rows);
        }
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["property-checklist", property.id] });
    const { data } = await supabase
      .from("property_checklist_items")
      .select("*")
      .eq("property_id", property.id)
      .order("sort_order", { ascending: true });
    return data ?? [];
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const allItems = await ensureAllChecklists();
      const lines: string[] = [];
      lines.push(`📋 *RELATÓRIO — ${property.code}${property.city ? ` (${property.city}/${property.state})` : ""}*`);
      lines.push("");
      lines.push(`📍 Etapa atual: *${stageLabel}*`);
      if (daysSinceAuction !== null) lines.push(`📅 Dias desde arrematação: *${daysSinceAuction} dias*`);
      if (updates && updates.length > 0) {
        const last = updates[0];
        lines.push(`🕐 Última atualização: ${format(new Date(last.update_date), "dd/MM/yyyy")} — ${last.content}`);
      }
      lines.push("");
      const filteredAllItems = (allItems || []).filter(item => {
        if (["Estratégia Definida", "Execução"].includes(item.group_name || "")) return false;
        if (["Histórico de pagamento conhecido", "Risco jurídico avaliado"].includes(item.task_name || "")) return false;
        return true;
      });
      const stagesWithItems = [property.stage].filter(s => filteredAllItems.some(item => item.stage === s));
      for (const stageValue of stagesWithItems) {
        const stageItems = filteredAllItems.filter(item => item.stage === stageValue);
        const stageLabelRaw = PROPERTY_STAGES.find(s => s.value === stageValue)?.label ?? stageValue;
        const stageLabel = stageLabelRaw.charAt(0).toUpperCase() + stageLabelRaw.slice(1).toLowerCase();
        const done = stageItems.filter(i => i.completed).length;
        const total = stageItems.length;
        let stageEmoji = done === total && total > 0 ? "🟢" : done > 0 ? "🟡" : "🔴";
        lines.push(`${stageEmoji} *Checklist — ${stageLabel}* (${done}/${total})`);
        const byGroup = new Map<string, typeof stageItems>();
        stageItems.forEach(item => {
          const list = byGroup.get(item.group_name || "") || [];
          list.push(item);
          byGroup.set(item.group_name || "", list);
        });
        for (const [groupName, groupItems] of byGroup.entries()) {
          const displayGroup = groupName.charAt(0).toUpperCase() + groupName.slice(1).toLowerCase();
          lines.push(`  _${displayGroup}_`);
          groupItems.forEach(item => {
            const emoji = item.completed ? "✅" : "⬜";
            const datePart = item.completed && item.completed_at ? ` (${format(new Date(item.completed_at), "dd/MM")})` : "";
            const notePart = item.notes ? `\n      💬 _Obs: ${item.notes}_` : "";
            let displayName = item.task_name;
            if (displayName?.toLowerCase().includes("fluxo do crm") || displayName?.toLowerCase().includes("cadastrado no crm")) {
              displayName = "Imóvel cadastrado no SMARTAPP";
            }
            lines.push(`    ${emoji} ${displayName}${datePart}${notePart}`);
          });
        }
        lines.push("");
      }
      if (approvedClients && approvedClients.length > 0) {
        lines.push("👤 *Clientes com crédito aprovado:*");
        approvedClients.forEach((link: any) => {
          const client = link.clients;
          if (!client) return;
          const phone = client.whatsapp || client.phone || "sem telefone";
          lines.push(`  • ${client.full_name} — ${phone}`);
        });
      }
      setReport(lines.join("\n"));
    } finally {
      setGenerating(false);
    }
  };

  const generatePreAuctionReport = () => {
    setGenerating(true);
    try {
      const lines: string[] = [];
      const formatCurrency = (val: any) => val ? Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val)) : "---";
      const formatDate = (date: any) => {
        if (!date) return "---";
        try { return format(new Date(date + "T12:00:00"), "dd/MM/yyyy"); } catch (e) { return "---"; }
      };
      lines.push(`📊 *ANÁLISE PRÉ-ARREMATAÇÃO – INVEST LAR*`);
      lines.push("");
      lines.push(`📆 Data vencimento do boleto: *${formatDate(property.bill_due_date)}*`);
      lines.push("");
      lines.push(`🏠 Código do imóvel: *${property.code}*`);
      lines.push("");
      lines.push(`📍 Endereço: *${property.address || "---"}*`);
      lines.push(`Link do Localização (Maps): ${property.maps_url || "---"}`);
      lines.push("");
      lines.push(`💰 Lance atual: *${formatCurrency(property.current_bid || property.purchase_price)}*`);
      lines.push("");
      lines.push(`📈 Valor de mercado: *${formatCurrency(property.market_value || property.listed_price)}*`);
      lines.push("");
      const expiry = mode === "pre_auction" ? property.appraisal_validity : property.appraisal_expiry;
      lines.push(`📅 Data de Validade do laudo: *${formatDate(expiry)}*`);
      lines.push("");
      lines.push(`📄 Débitos`);
      const iptuVal = mode === "pre_auction" ? property.iptu : property.iptu_debts;
      const condoVal = mode === "pre_auction" ? property.condo_fees : property.condo_debts;
      lines.push(`•  IPTU: *${formatCurrency(iptuVal)}*`);
      lines.push(`•  Condomínio: *${formatCurrency(condoVal)}*`);
      lines.push("");
      lines.push(`🧱 Condicoes do imóvel:`);
      lines.push(`${property.property_conditions || "---"}`);
      lines.push("");
      lines.push(`📄 Analise da Matricula:`);
      lines.push(`${property.registry_analysis || "---"}`);
      lines.push("");
      lines.push(`🗃️ Analise juridica:`);
      lines.push(`${property.legal_analysis || "---"}`);
      lines.push("");
      lines.push(`🔐 Segurança da região:`);
      lines.push(`${property.security_analysis || (property as any).neighborhood_security || "---"}`);
      lines.push("");
      lines.push(`🏪 Comércios, transporte e serviços:`);
      lines.push(`${property.transport_analysis || (property as any).neighborhood_amenities || "---"}`);
      lines.push("");
      lines.push(`📞 Contato do ocupante: *${property.occupant_contact || "---"}*`);
      lines.push("");
      lines.push(`📞 Contato do síndico: *${property.syndic_contact || "---"}*`);
      lines.push("");
      const adminContact = mode === "pre_auction" ? property.manager_contact : (property as any).admin_contact;
      lines.push(`🏢 Contato Administradora: *${adminContact || "---"}*`);
      setReport(lines.join("\n"));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {mode === "property" ? "Relatório resumido do status do imóvel." : "Relatório de análise pré-arrematação."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {mode === "property" && (
          <Button onClick={generateReport} disabled={isLoading || generating} variant="outline" className="w-full">
            {isLoading || generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            Resumo Status
          </Button>
        )}
        {mode === "pre_auction" && (
          <Button onClick={generatePreAuctionReport} disabled={isLoading || generating} className="w-full bg-primary font-bold">
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ClipboardCopy className="h-4 w-4 mr-2" />}
            Análise Pré-Arrematação
          </Button>
        )}
      </div>

      {report && (
        <div className="space-y-2">
          <Textarea value={report} readOnly rows={18} className="text-xs font-mono whitespace-pre-wrap" />
          <Button variant="outline" className="w-full" onClick={handleCopy}>
            {copied ? <><Check className="h-4 w-4 mr-2 text-primary" />Copiado!</> : <><ClipboardCopy className="h-4 w-4 mr-2" />Copiar Relatório</>}
          </Button>
        </div>
      )}
    </div>
  );
}
