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
import type { Property } from "@/hooks/useProperties";
import type { TablesInsert } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type PropertyStage = Database["public"]["Enums"]["property_stage"];

interface Props {
  property: Property;
}

export default function PropertyReportGenerator({ property }: Props) {
  const { data: checklistItems, isLoading: loadingChecklist } = usePropertyChecklist(property.id);
  const { data: updates, isLoading: loadingUpdates } = usePropertyUpdates(property.id);
  const [report, setReport] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch linked clients with approved credit
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

  // Ensure checklists exist for current and all previous stages
  const ensureAllChecklists = async () => {
    const stageOrder = PROPERTY_STAGES.map(s => s.value);
    const currentIdx = stageOrder.indexOf(property.stage);

    for (let i = 0; i <= currentIdx; i++) {
      const stage = stageOrder[i] as PropertyStage;
      const { data: existing } = await supabase
        .from("property_checklist_items")
        .select("id")
        .eq("property_id", property.id)
        .eq("stage", stage)
        .limit(1);

      if (!existing || existing.length === 0) {
        const templates = getTemplatesForStage(stage);
        if (templates.length > 0) {
          const rows: TablesInsert<"property_checklist_items">[] = templates.map(t => ({
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

    // Refresh checklist data
    await queryClient.invalidateQueries({ queryKey: ["property-checklist", property.id] });
    // Re-fetch to get fresh data
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

    lines.push(`📋 *RELATÓRIO — ${property.code}*`);
    lines.push("");
    lines.push(`📍 Etapa atual: *${stageLabel}*`);
    if (daysSinceAuction !== null) {
      lines.push(`📅 Dias desde arrematação: *${daysSinceAuction} dias*`);
    }

    // Last update
    if (updates && updates.length > 0) {
      const last = updates[0];
      lines.push(`🕐 Última atualização: ${format(new Date(last.update_date), "dd/MM/yyyy")} — ${last.content.substring(0, 100)}${last.content.length > 100 ? "..." : ""}`);
    } else {
      lines.push(`🕐 Última atualização: _Nenhuma registrada_`);
    }

    lines.push("");

    // Checklist grouped by group for current stage only
    const currentStageItems = (allItems || []).filter(item => item.stage === property.stage);
    
    if (currentStageItems.length > 0) {
      const done = currentStageItems.filter(i => i.completed).length;
      const total = currentStageItems.length;

      // Determine stage emoji
      let stageEmoji = "🔴";
      if (done === total) stageEmoji = "🟢";
      else if (done > 0) stageEmoji = "🟡";

      lines.push(`${stageEmoji} *Checklist — ${stageLabel}* (${done}/${total})`);

      // Group by group_name
      const byGroup = new Map<string, typeof currentStageItems>();
      currentStageItems.forEach(item => {
        const list = byGroup.get(item.group_name) || [];
        list.push(item);
        byGroup.set(item.group_name, list);
      });

      for (const [groupName, groupItems] of byGroup.entries()) {
        lines.push(`  _${groupName}_`);
        groupItems.forEach(item => {
          const emoji = item.completed ? "✅" : "⬜";
          const datePart = item.completed && item.completed_at
            ? ` (${format(new Date(item.completed_at), "dd/MM")})`
            : "";
          lines.push(`    ${emoji} ${item.task_name}${datePart}`);
        });
      }
      lines.push("");
    } else {
      lines.push("_Nenhum checklist registrado para esta etapa._");
      lines.push("");
    }

    // Approved clients
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Gere um relatório resumido do status do imóvel para copiar e compartilhar.
        </p>
      </div>

      <Button onClick={generateReport} disabled={isLoading || generating} className="w-full">
        {isLoading || generating ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        {generating ? "Gerando..." : "Gerar Relatório"}
      </Button>

      {report && (
        <div className="space-y-2">
          <Textarea
            value={report}
            readOnly
            rows={18}
            className="text-xs font-mono whitespace-pre-wrap"
          />
          <Button variant="outline" className="w-full" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-primary" />
                Copiado!
              </>
            ) : (
              <>
                <ClipboardCopy className="h-4 w-4 mr-2" />
                Copiar Relatório
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
