import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Activity = Tables<"activities"> & {
  clients?: { full_name: string; phone: string | null } | null;
  properties?: { code: string; city: string | null; responsible_user_id: string | null } | null;
  responsible_profile?: { full_name: string } | null;
};

export function useActivities() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("activities-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities" },
        () => {
          qc.invalidateQueries({ queryKey: ["activities"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
  return useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*, clients(full_name, phone), properties(code, city, responsible_user_id)")
        .order("updated_at", { ascending: false })
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;

      const userIds = [...new Set(data.map((a) => a.responsible_user_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));
      }

      return data.map((a) => ({
        ...a,
        responsible_profile: profileMap[a.responsible_user_id]
          ? { full_name: profileMap[a.responsible_user_id] }
          : null,
      })) as Activity[];
      return data as Activity[];
    },
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"activities">) => {
      const { data, error } = await supabase.from("activities").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}

export function useUpdateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"activities"> & { id: string }) => {
      const { data, error } = await supabase.from("activities").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ["activities"] });
      const previous = qc.getQueryData<Activity[]>(["activities"]);

      qc.setQueryData<Activity[]>(["activities"], (old) => {
        if (!old) return [];
        const item = old.find(a => a.id === id);
        if (!item) return old;
        const filtered = old.filter(a => a.id !== id);
        return [{ ...item, ...updates, updated_at: new Date().toISOString() }, ...filtered];
      });

      return { previous };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
    onError: (err, variables, context) => {
      if (context?.previous) {
        qc.setQueryData(["activities"], context.previous);
      }
    },
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}
