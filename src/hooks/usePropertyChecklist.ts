import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { getTemplatesForStage, getNextStage } from "@/lib/checklist-templates";
import { toast } from "sonner";

export type ChecklistItem = Tables<"property_checklist_items">;
type PropertyStage = Database["public"]["Enums"]["property_stage"];

export function usePropertyChecklist(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["property-checklist", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const isPreAuction = window.location.pathname.includes('pre-auction');
      const query = supabase.from("property_checklist_items").select("*");
      
      if (isPreAuction) {
        query.eq("pre_auction_property_id", propertyId!);
      } else {
        query.eq("property_id", propertyId!);
      }

      const { data, error } = await query.order("sort_order", { ascending: true });
      if (error) throw error;
      
      // Filter out obsolete groups or tasks that should no longer exist
      const filteredData = (data as ChecklistItem[] || []).filter(
        item => {
          if (["Estratégia Definida", "Execução"].includes(item.group_name || "")) return false;
          if (["Histórico de pagamento conhecido", "Risco jurídico avaliado"].includes(item.task_name || "")) return false;
          return true;
        }
      );
      
      return filteredData;
    },
  });
}

export function useChecklistForStage(propertyId: string | undefined, stage: PropertyStage) {
  const { data: allItems, ...rest } = usePropertyChecklist(propertyId);
  const items = allItems?.filter(i => i.stage === stage) ?? [];
  return { data: items, ...rest };
}

/** Creates default checklist items for a given property+stage if none exist yet */
export function useCreateChecklistForStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyId, stage }: { propertyId: string; stage: PropertyStage }) => {
      // 0. CLEANUP: Always remove obsolete groups if they exist for this property/stage
      await supabase
        .from("property_checklist_items")
        .delete()
        .eq("property_id", propertyId)
        .in("group_name", ["Estratégia Definida", "Execução"]);

      const isPreAuction = window.location.pathname.includes('pre-auction');
      const query = supabase.from("property_checklist_items").select("id").eq("stage", stage).limit(1);

      if (isPreAuction) {
        query.eq("pre_auction_property_id", propertyId);
      } else {
        query.eq("property_id", propertyId);
      }

      const { data: existing } = await query;

      if (existing && existing.length > 0) return existing;

      // 2. No items? Create them from template
      let templates = getTemplatesForStage(stage);
      let rows: TablesInsert<"property_checklist_items">[] = [];

      if (templates.length > 0) {
        rows = templates.map(t => ({
          property_id: isPreAuction ? null : propertyId,
          pre_auction_property_id: isPreAuction ? propertyId : null,
          stage: t.stage,
          group_name: t.group,
          task_name: t.task,
          sort_order: t.sort,
        }));
      } else {
        // 3. Try dynamic templates from kanban_stages
        const { data: stageData } = await supabase
          .from("kanban_stages")
          .select("checklist")
          .eq("value", stage)
          .maybeSingle();

        if (stageData?.checklist) {
          const checklist = stageData.checklist as any[];
          checklist.forEach((section: any, sIdx: number) => {
            if (section.items) {
              section.items.forEach((task: string, tIdx: number) => {
                rows.push({
                  property_id: propertyId,
                  stage,
                  group_name: section.title,
                  task_name: task,
                  sort_order: sIdx * 100 + tIdx,
                });
              });
            }
          });
        }
      }

      if (rows.length > 0) {
        const { data, error } = await supabase.from("property_checklist_items").insert(rows).select();
        if (error) throw error;
        return data;
      }

      return [];
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["property-checklist", vars.propertyId] });
    },
    onError: (error: any) => {
      console.error("Error creating checklist:", error);
      toast.error("Erro ao inicializar checklist: " + (error.message || "Erro desconhecido"));
    }
  });
}

/** Toggle a checklist item and auto-advance stage if all items are done */
export function useToggleChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      item,
      userId,
    }: {
      item: ChecklistItem;
      userId: string;
    }) => {
      const nowCompleted = !item.completed;
      const { error } = await supabase
        .from("property_checklist_items")
        .update({
          completed: nowCompleted,
          completed_at: nowCompleted ? new Date().toISOString() : null,
          completed_by: nowCompleted ? userId : null,
        })
        .eq("id", item.id);
      if (error) throw error;

      // Check if all items for this stage are now completed
      if (nowCompleted) {
        const { data: stageItems } = await supabase
          .from("property_checklist_items")
          .select("completed")
          .eq("property_id", item.property_id)
          .eq("stage", item.stage);

        const allDone = stageItems?.every(i => i.completed) ?? false;
        if (allDone) {
          const nextStage = getNextStage(item.stage as PropertyStage);
          if (nextStage) {
            // Advance the property
            const { error: updateErr } = await supabase
              .from("properties")
              .update({ stage: nextStage })
              .eq("id", item.property_id);
            if (updateErr) throw updateErr;

            // Create checklist for new stage
            const templates = getTemplatesForStage(nextStage);
            if (templates.length > 0) {
              const { data: existingNext } = await supabase
                .from("property_checklist_items")
                .select("id")
                .eq("property_id", item.property_id)
                .eq("stage", nextStage)
                .limit(1);

              if (!existingNext || existingNext.length === 0) {
                const rows: TablesInsert<"property_checklist_items">[] = templates.map(t => ({
                  property_id: item.property_id,
                  stage: t.stage,
                  group_name: t.group,
                  task_name: t.task,
                  sort_order: t.sort,
                }));
                await supabase.from("property_checklist_items").insert(rows);
              }
            }

            toast.success(`Checklist completo! Imóvel avançou para a próxima etapa.`);
            qc.invalidateQueries({ queryKey: ["properties"] });
          }
        }
      }

      return { nowCompleted };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["property-checklist", vars.item.property_id] });
    },
    onError: (error: any) => {
      console.error("Error toggling checklist item:", error);
      toast.error("Erro ao atualizar item: " + (error.message || "Erro desconhecido"));
    }
  });
}

/** Update the notes of a checklist item */
export function useUpdateChecklistNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes, propertyId }: { id: string; notes: string; propertyId: string }) => {
      const { error } = await supabase
        .from("property_checklist_items")
        .update({ notes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["property-checklist", vars.propertyId] });
    },
  });
}

/** Update the completed_at date of a checklist item */
export function useUpdateChecklistDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completedAt, propertyId }: { id: string; completedAt: string; propertyId: string }) => {
      const { error } = await supabase
        .from("property_checklist_items")
        .update({ completed_at: completedAt })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["property-checklist", vars.propertyId] });
    },
  });
}

/** Add a specific strategy checklist to a property stage */
export function useDeleteChecklistGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ propertyId, itemIds }: { propertyId: string; itemIds: string[] }) => {
      console.log(`Deleting ${itemIds.length} checklist items for property ${propertyId}`);
      
      const { error } = await supabase
        .from("property_checklist_items")
        .delete()
        .in("id", itemIds);

      if (error) throw error;
      
      // Small delay for DB consistency
      await new Promise(resolve => setTimeout(resolve, 300));
    },
    onMutate: async ({ propertyId, itemIds }) => {
      await queryClient.cancelQueries({ queryKey: ["property-checklist", propertyId] });
      const previousItems = queryClient.getQueryData<ChecklistItem[]>(["property-checklist", propertyId]);

      if (previousItems) {
        queryClient.setQueryData<ChecklistItem[]>(["property-checklist", propertyId], 
          previousItems.filter(item => !itemIds.includes(item.id))
        );
      }

      return { previousItems };
    },
    onSuccess: async (_, { propertyId }) => {
      await queryClient.invalidateQueries({ 
        queryKey: ["property-checklist", propertyId]
      });
      await queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success("Grupo excluído com sucesso.");
    },
    onError: (error, { propertyId, groupName }, context) => {
      // Rollback if there's an error
      if (context?.previousItems) {
        queryClient.setQueryData(["property-checklist", propertyId], context.previousItems);
      }
      console.error(`Error deleting group "${groupName}":`, error);
      toast.error("Falha ao excluir grupo: " + error.message);
    },
  });
}


export function useAddChecklistStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      propertyId, 
      stage, 
      strategyName,
      tasks 
    }: { 
      propertyId: string; 
      stage: PropertyStage; 
      strategyName: string;
      tasks: string[];
    }) => {
      // Find max sort_order to append
      const { data: items } = await supabase
        .from("property_checklist_items")
        .select("sort_order")
        .eq("property_id", propertyId)
        .eq("stage", stage)
        .order("sort_order", { ascending: false })
        .limit(1);
      
      const maxSort = items?.[0]?.sort_order ?? 0;

      const rows: TablesInsert<"property_checklist_items">[] = tasks.map((task, idx) => ({
        property_id: propertyId,
        stage: stage,
        group_name: strategyName,
        task_name: task,
        sort_order: maxSort + 1 + idx,
      }));

      const { error } = await supabase.from("property_checklist_items").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["property-checklist", vars.propertyId] });
      toast.success(`Estratégia "${vars.strategyName}" adicionada ao checklist.`);
    },
    onError: (error: any) => {
      console.error("Error adding strategy:", error);
      toast.error("Erro ao adicionar estratégia: " + (error.message || "Erro desconhecido"));
    }
  });
}
