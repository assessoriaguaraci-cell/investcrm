import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type ClientPropertyLink = Tables<"client_property_links">;

export interface LinkWithRelations extends ClientPropertyLink {
  clients: { full_name: string; phone: string | null; whatsapp: string | null; temperature: string } | null;
  properties: { code: string; city: string | null; state: string; listed_price: number | null; stage: string } | null;
}

export function useClientPropertyLinks() {
  return useQuery({
    queryKey: ["client_property_links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_property_links")
        .select("*, clients(full_name, phone, whatsapp, temperature), properties(code, city, state, listed_price, stage)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LinkWithRelations[];
    },
  });
}

export function useCreateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"client_property_links">) => {
      const { data, error } = await supabase.from("client_property_links").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_property_links"] }),
  });
}

export function useUpdateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"client_property_links"> & { id: string }) => {
      const { data, error } = await supabase.from("client_property_links").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_property_links"] }),
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_property_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_property_links"] }),
  });
}
