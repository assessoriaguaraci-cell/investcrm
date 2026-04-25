import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PropertyFunnel {
  id: string;
  name: string;
  created_at: string;
}

export function usePropertyFunnels() {
  return useQuery({
    queryKey: ["property-funnels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_funnels")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) {
          console.warn("Table property_funnels not found yet");
          return [] as PropertyFunnel[];
      }
      return data as PropertyFunnel[];
    },
  });
}

export function useCreatePropertyFunnel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("property_funnels")
        .insert({ name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-funnels"] });
      toast.success("Funil criado com sucesso!");
    },
  });
}
