import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { getTemplatesForStage } from "@/lib/checklist-templates";
import { format, subDays } from "date-fns";

export type Property = Tables<"properties">;

export function useProperties(funnelId?: string) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("properties-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "properties" },
        () => {
          qc.invalidateQueries({ queryKey: ["properties", funnelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, funnelId]);

  return useQuery({
    queryKey: ["properties", funnelId],
    queryFn: async () => {
      let query = supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (funnelId) {
        query = query.eq("funnel_id", funnelId);
      } else {
        // Option to filter by NULL funnel_id for the "Default" funnel
        // query = query.is("funnel_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Property[];
    },
  });
}

async function createAppraisalReminders(propertyId: string, propertyCode: string, expiryDate: string, userId: string) {
  // Delete existing appraisal reminders for this property
  await supabase
    .from("activities")
    .delete()
    .eq("property_id", propertyId)
    .like("description", "Laudo vencendo%");

  const expiry = new Date(expiryDate + "T12:00:00");
  const reminders = [30, 15, 7, 1];

  const rows = reminders.map(days => ({
    property_id: propertyId,
    description: `Laudo vencendo em ${days} dia(s) — ${propertyCode}`,
    activity_type: "lembrete",
    due_date: format(subDays(expiry, days), "yyyy-MM-dd"),
    created_by: userId,
    responsible_user_id: userId,
    status: "pendente" as const,
  }));

  await supabase.from("activities").insert(rows);
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

      // Auto-create appraisal reminders if expiry is set
      if ((input as any).appraisal_expiry) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await createAppraisalReminders(data.id, data.code, (input as any).appraisal_expiry, user.id);
        }
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

      // If appraisal_expiry was updated, recreate reminders
      if ("appraisal_expiry" in updates && (updates as any).appraisal_expiry) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await createAppraisalReminders(data.id, data.code, (updates as any).appraisal_expiry, user.id);
        }
      }

      return data;
    },
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ["properties"] });
      const previousProperties = qc.getQueryData<Property[]>(["properties"]);

      qc.setQueryData<Property[]>(["properties"], (old) => {
        if (!old) return [];
        return old.map((p) => (p.id === id ? { ...p, ...updates } : p));
      });

      return { previousProperties };
    },
    onError: (err, variables, context) => {
      if (context?.previousProperties) {
        qc.setQueryData(["properties"], context.previousProperties);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}
