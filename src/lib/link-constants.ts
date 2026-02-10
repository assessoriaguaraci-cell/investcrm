import type { Database } from "@/integrations/supabase/types";

type LinkStatus = Database["public"]["Enums"]["link_status"];

export const LINK_STATUSES: { value: LinkStatus; label: string; color: string }[] = [
  { value: "interessado", label: "Interessado", color: "bg-blue-500" },
  { value: "contatado", label: "Contatado", color: "bg-cyan-500" },
  { value: "visita", label: "Visita", color: "bg-amber-500" },
  { value: "proposta_enviada", label: "Proposta Enviada", color: "bg-orange-500" },
  { value: "contraproposta", label: "Contraproposta", color: "bg-purple-500" },
  { value: "recusou", label: "Recusou", color: "bg-destructive" },
  { value: "fechado", label: "Fechado", color: "bg-green-600" },
];

export function getLinkStatusLabel(status: LinkStatus): string {
  return LINK_STATUSES.find(s => s.value === status)?.label ?? status;
}

export function getLinkStatusColor(status: LinkStatus): string {
  return LINK_STATUSES.find(s => s.value === status)?.color ?? "bg-muted";
}
