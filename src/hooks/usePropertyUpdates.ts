import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PropertyUpdate {
  id: string;
  property_id: string;
  content: string;
  update_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  stage: string | null;
  days_since_auction: number | null;
}

export function usePropertyUpdates(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["property-updates", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_updates")
        .select("*")
        .eq("property_id", propertyId!)
        .order("update_date", { ascending: false });
      if (error) throw error;
      return data as PropertyUpdate[];
    },
  });
}

export function useCreatePropertyUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyId, content, updateDate, userId, stage, daysSinceAuction }: {
      propertyId: string; content: string; updateDate: string; userId: string;
      stage?: string; daysSinceAuction?: number;
    }) => {
      const { data, error } = await supabase
        .from("property_updates")
        .insert({
          property_id: propertyId,
          content,
          update_date: updateDate,
          created_by: userId,
          stage: stage ?? null,
          days_since_auction: daysSinceAuction ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["property-updates", vars.propertyId] });
      toast.success("Atualização adicionada!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar atualização"),
  });
}

export function useDeletePropertyUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, propertyId }: { id: string; propertyId: string }) => {
      const { error } = await supabase.from("property_updates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["property-updates", vars.propertyId] });
    },
  });
}
