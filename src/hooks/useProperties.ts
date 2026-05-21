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
    queryKey: funnelId ? ["properties", funnelId] : ["properties"],
    queryFn: async () => {
      let query = supabase
        .from("properties")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(5000);

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
  const expiry = new Date(expiryDate + "T12:00:00");
  const today = new Date();
  
  // Calculate remaining days
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Determine which reminder threshold we are currently in: 30, 15, 7 or 1
  let daysThreshold = 30;
  if (diffDays <= 1) {
    daysThreshold = 1;
  } else if (diffDays <= 7) {
    daysThreshold = 7;
  } else if (diffDays <= 15) {
    daysThreshold = 15;
  }
  
  const targetDueDate = format(subDays(expiry, daysThreshold), "yyyy-MM-dd");
  const targetDescription = `Laudo vencendo em ${daysThreshold} dia(s) — ${propertyCode}`;

  // Fetch existing appraisal reminders
  const { data: existingReminders } = await supabase
    .from("activities")
    .select("id, description, status")
    .eq("property_id", propertyId)
    .like("description", "Laudo vencendo%")
    .order("created_at", { ascending: false });

  if (existingReminders && existingReminders.length > 0) {
    // If one exists, update it to the appropriate bracket
    const primaryReminder = existingReminders[0];
    await supabase
      .from("activities")
      .update({
        description: targetDescription,
        due_date: targetDueDate,
        status: "pendente", // Reset to pending for the new alert phase
      })
      .eq("id", primaryReminder.id);

    // Delete any other duplicate reminders that might exist from legacy logic
    if (existingReminders.length > 1) {
      const extraIds = existingReminders.slice(1).map(r => r.id);
      await supabase
        .from("activities")
        .delete()
        .in("id", extraIds);
    }
  } else {
    // Insert exactly one new active appraisal reminder
    await supabase.from("activities").insert({
      property_id: propertyId,
      description: targetDescription,
      activity_type: "lembrete",
      due_date: targetDueDate,
      created_by: userId,
      responsible_user_id: userId,
      status: "pendente",
    });
  }
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
      const { data, error } = await supabase.from("properties").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
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
      
      // Update all queries that start with "properties"
      qc.getQueriesData({ queryKey: ["properties"] }).forEach(([queryKey, oldData]) => {
        if (!oldData) return;
        const old = oldData as Property[];
        const item = old.find(p => p.id === id);
        if (!item) return;
        
        const filtered = old.filter(p => p.id !== id);
        const updated = { ...item, ...updates, updated_at: new Date().toISOString() };
        qc.setQueryData(queryKey, [updated, ...filtered]);
      });

      return { };
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
