import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CityInfo {
  id: string;
  state: string;
  city: string;
  best_neighborhoods: string | null;
  worst_neighborhoods: string | null;
  considerations: string | null;
  dangerous_regions: string | null;
  where_sold: string | null;
  created_at: string;
  updated_at: string;
}

export function useCityInfo() {
  return useQuery({
    queryKey: ["city_info"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_info")
        .select("*")
        .order("state", { ascending: true });
      if (error) throw error;
      return data as CityInfo[];
    },
  });
}

export function useUpsertCityInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CityInfo> & { state: string; city: string }) => {
      const { data, error } = await supabase
        .from("city_info")
        .upsert(input, { onConflict: "state,city" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["city_info"] }),
  });
}
