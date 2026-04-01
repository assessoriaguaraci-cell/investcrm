import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Client = Tables<"clients">;

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"clients">) => {
      const { data, error } = await supabase.from("clients").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"clients"> & { id: string }) => {
      const { data, error } = await supabase.from("clients").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ["clients"] });
      const previousClients = qc.getQueryData<Client[]>(["clients"]);

      qc.setQueryData<Client[]>(["clients"], (old) => {
        if (!old) return [];
        return old.map((c) => (c.id === id ? { ...c, ...updates } : c));
      });

      return { previousClients };
    },
    onError: (err, variables, context) => {
      if (context?.previousClients) {
        qc.setQueryData(["clients"], context.previousClients);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
