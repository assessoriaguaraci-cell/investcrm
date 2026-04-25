import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface KanbanStage {
    id: string;
    funnel_type: "property" | "client";
    value: string;
    label: string;
    color: string;
    sort_order: number;
    pipeline?: string;
}

export const PRESET_COLORS = [
    { name: "Azul", class: "bg-blue-500" },
    { name: "Verde", class: "bg-green-500" },
    { name: "Amarelo", class: "bg-yellow-500" },
    { name: "Laranja", class: "bg-orange-500" },
    { name: "Vermelho", class: "bg-red-500" },
    { name: "Roxo", class: "bg-purple-500" },
    { name: "Rosa", class: "bg-pink-500" },
    { name: "Cinza", class: "bg-slate-500" },
];

export function useKanbanStages(funnelType: "property" | "client", funnelId?: string) {
    const queryClient = useQueryClient();

    const { data: stages = [], isLoading } = useQuery({
        queryKey: ["kanban_stages", funnelType, funnelId],
        queryFn: async () => {
            try {
                let query = (supabase as any)
                    .from("kanban_stages")
                    .select("*")
                    .eq("funnel_type", funnelType)
                    .order("sort_order", { ascending: true });

                if (funnelId) {
                    query = query.eq("funnel_id", funnelId);
                } else if (funnelType === 'property') {
                    // For main property funnel, we might want stages with NULL funnel_id
                    query = query.is("funnel_id", null);
                }

                const { data, error } = await query;

                if (error) {
                    console.warn("Kanban stages table not found or error fetching, falling back to constants:", error.message);
                    return [] as KanbanStage[];
                }
                return data as KanbanStage[];
            } catch (err: any) {
                console.warn("Error fetching kanban stages, falling back to constants:", err.message);
                return [] as KanbanStage[];
            }
        },
        retry: false,
    });

    const addStageMutation = useMutation({
        mutationFn: async (newStage: Omit<KanbanStage, "id" | "sort_order">) => {
            // Get the highest sort_order
            const maxSortOrder = stages.reduce((max, s) => Math.max(max, s.sort_order), 0);

            const { error } = await (supabase as any)
                .from("kanban_stages")
                .insert({
                    ...newStage,
                    sort_order: maxSortOrder + 10,
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["kanban_stages", funnelType] });
        },
    });

    const updateStageMutation = useMutation({
        mutationFn: async ({ id, ...updates }: Partial<KanbanStage> & { id: string }) => {
            const { error } = await (supabase as any)
                .from("kanban_stages")
                .update(updates)
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["kanban_stages", funnelType] });
        },
    });

    const deleteStageMutation = useMutation({
        mutationFn: async ({ stageValue, destinationStageValue }: { stageValue: string; destinationStageValue: string }) => {
            // 1. Move all items from this stage to the destination stage
            const table = funnelType === "property" ? "properties" : "clients";
            const { error: moveError } = await (supabase as any)
                .from(table)
                .update({ stage: destinationStageValue })
                .eq("stage", stageValue);

            if (moveError) throw moveError;

            // 2. Delete the stage from kanban_stages
            const { error: deleteError } = await (supabase as any)
                .from("kanban_stages")
                .delete()
                .eq("funnel_type", funnelType)
                .eq("value", stageValue);

            if (deleteError) throw deleteError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["kanban_stages", funnelType] });
            queryClient.invalidateQueries({ queryKey: [funnelType === "property" ? "properties" : "clients"] });
        },
    });

    return {
        stages,
        isLoading,
        addStage: addStageMutation.mutateAsync,
        isAdding: addStageMutation.isPending,
        updateStage: updateStageMutation.mutateAsync,
        deleteStage: deleteStageMutation.mutateAsync,
        isDeleting: deleteStageMutation.isPending,
    };
}
