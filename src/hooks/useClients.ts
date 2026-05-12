import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Client = Tables<"clients">;

export function useClients() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("clients-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => {
          qc.invalidateQueries({ queryKey: ["clients"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const BATCH_SIZE = 1000;
      
      // Primeiro, pegamos a contagem total exata
      const { count, error: countError } = await supabase
        .from("clients")
        .select("*", { count: 'exact', head: true });
      
      if (countError) throw countError;
      
      const total = count || 0;
      const numPages = Math.ceil(total / BATCH_SIZE);
      
      // Criamos promessas para buscar todas as páginas em paralelo
      const promises = Array.from({ length: numPages }, (_, i) => {
        const from = i * BATCH_SIZE;
        const to = from + BATCH_SIZE - 1;
        return supabase
          .from("clients")
          .select("*, responsible:responsible_user_id(full_name)")
          .order("created_at", { ascending: false })
          .range(from, to);
      });
      
      const results = await Promise.all(promises);
      
      let allClients: Client[] = [];
      for (const res of results) {
        if (res.error) throw res.error;
        if (res.data) {
          allClients = [...allClients, ...(res.data as Client[])];
        }
      }
      
      return allClients;
    },
    // Forçamos o refetch para garantir que não use cache antigo
    staleTime: 0,
    gcTime: 0
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

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
