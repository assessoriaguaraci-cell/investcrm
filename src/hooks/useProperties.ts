import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { getTemplatesForStage } from "@/lib/checklist-templates";

export type Property = Tables<"properties">;

export function useProperties() {
  return useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Property[];
    },
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"properties">) => {
      const { data, error } = await supabase.from("properties").insert(input).select().single();
      if (error) throw error;

      // Auto-create checklist for the initial stage
      const stage = data.stage ?? "pre_arrematacao";
      const templates = getTemplatesForStage(stage);
      if (templates.length > 0) {
        const rows = templates.map(t => ({
          property_id: data.id,
          stage: t.stage,
          group_name: t.group,
          task_name: t.task,
          sort_order: t.sort,
        }));
        await supabase.from("property_checklist_items").insert(rows);
      }

      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"properties"> & { id: string }) => {
      const { data, error } = await supabase.from("properties").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}
