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
  diligence_history: string | null;
  created_at: string;
  served_cities?: {
    city_info: CityInfo;
  }[];
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
        .select("*, served_cities:contact_served_cities(city_info(*))")
        .eq("city_info_id", cityInfoId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CityContact[];
    },
  });
}

export function useAllCityContacts() {
  return useQuery({
    queryKey: ["all_city_contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_contacts")
        .select(`
          id, 
          name, 
          contact_type, 
          phone, 
          has_served, 
          pix_key, 
          notes, 
          diligence_history,
          city_info:city_info_id(city, state),
          served_cities:contact_served_cities(
            city_info:city_info_id(city, state)
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
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
    mutationFn: async ({ served_city_ids, ...contact }: Omit<CityContact, "id" | "created_at"> & { served_city_ids?: string[] }) => {
      const { data: newContact, error } = await supabase.from("city_contacts").insert(contact).select().single();
      if (error) throw error;

      if (served_city_ids && served_city_ids.length > 0) {
        const links = served_city_ids.map(id => ({
          contact_id: newContact.id,
          city_info_id: id
        }));
        await (supabase.from("contact_served_cities" as any)).insert(links);
      }

      return newContact;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["city_contacts", variables.city_info_id] });
      qc.invalidateQueries({ queryKey: ["all_city_contacts"] });
    },
  });
}

export function useUpdateCityContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, served_city_ids, ...updates }: Partial<CityContact> & { id: string, served_city_ids?: string[] }) => {
      const { data, error } = await supabase.from("city_contacts").update(updates).eq("id", id).select().single();
      if (error) throw error;

      if (served_city_ids) {
        // Simple strategy: delete and re-insert
        await (supabase.from("contact_served_cities" as any)).delete().eq("contact_id", id);
        if (served_city_ids.length > 0) {
          const links = served_city_ids.map(cityId => ({
            contact_id: id,
            city_info_id: cityId
          }));
          await (supabase.from("contact_served_cities" as any)).insert(links);
        }
      }

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["city_contacts", data.city_info_id] });
      qc.invalidateQueries({ queryKey: ["all_city_contacts"] });
    },
  });
}

export function useDeleteCityContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, city_info_id }: { id: string; city_info_id: string }) => {
      const { error } = await supabase.from("city_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["city_contacts", variables.city_info_id] });
      qc.invalidateQueries({ queryKey: ["all_city_contacts"] });
    },
  });
}

// IBGE Localidades
export interface IBGEState {
  id: number;
  sigla: string;
  nome: string;
}

export interface IBGECity {
  id: number;
  nome: string;
}

export function useBrazilStates() {
  return useQuery({
    queryKey: ["brazil_states"],
    queryFn: async () => {
      const resp = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");
      return resp.json() as Promise<IBGEState[]>;
    },
    staleTime: Infinity,
  });
}

export function useBrazilCities(uf?: string) {
  return useQuery({
    queryKey: ["brazil_cities", uf],
    enabled: !!uf,
    queryFn: async () => {
      const resp = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
      return resp.json() as Promise<IBGECity[]>;
    },
    staleTime: Infinity,
  });
}
