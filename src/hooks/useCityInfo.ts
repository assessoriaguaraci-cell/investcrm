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

export interface CityContact {
  id: string;
  city_info_id: string;
  contact_type: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  has_served: boolean;
  pix_key: string | null;
  created_at: string;
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

export function useCityContacts(cityInfoId?: string) {
  return useQuery({
    queryKey: ["city_contacts", cityInfoId],
    enabled: !!cityInfoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_contacts")
        .select("*")
        .eq("city_info_id", cityInfoId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CityContact[];
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

export function useCreateCityContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contact: Omit<CityContact, "id" | "created_at">) => {
      const { data, error } = await supabase.from("city_contacts").insert(contact).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => qc.invalidateQueries({ queryKey: ["city_contacts", variables.city_info_id] }),
  });
}

export function useUpdateCityContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CityContact> & { id: string }) => {
      const { data, error } = await supabase.from("city_contacts").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["city_contacts", data.city_info_id] }),
  });
}

export function useDeleteCityContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, city_info_id }: { id: string; city_info_id: string }) => {
      const { error } = await supabase.from("city_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => qc.invalidateQueries({ queryKey: ["city_contacts", variables.city_info_id] }),
  });
}
