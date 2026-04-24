import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PreAuctionProperty, PreAuctionStage, PreAuctionFunnel } from "@/types/pre-auction";
import { toast } from "sonner";

export function usePreAuctionFunnels() {
  return useQuery({
    queryKey: ["pre-auction-funnels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pre_auction_funnels")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as PreAuctionFunnel[];
    },
  });
}

export function usePreAuctionProperties(funnelId?: string) {
  return useQuery({
    queryKey: ["pre-auction-properties", funnelId],
    queryFn: async () => {
      let query = supabase
        .from("pre_auction_properties")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (funnelId) {
        query = query.eq("funnel_id", funnelId);
      } else {
        query = query.is("funnel_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PreAuctionProperty[];
    },
  });
}

export function useUpdatePreAuctionProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (property: Partial<PreAuctionProperty> & { id: string }) => {
      const { data, error } = await supabase
        .from("pre_auction_properties")
        .update(property)
        .eq("id", property.id)
        .select()
        .single();
      
      if (error) throw error;

      if (property.stage === 'arrematado') {
        await handleArrematadoAutomation(data as PreAuctionProperty);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-auction-properties"] });
      toast.success("Imóvel atualizado!");
    },
  });
}

export function useCreatePreAuctionProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (property: Partial<PreAuctionProperty>) => {
      const { data, error } = await supabase
        .from("pre_auction_properties")
        .insert(property)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-auction-properties"] });
      toast.success("Imóvel adicionado!");
    },
  });
}

export function useCreatePreAuctionFunnel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("pre_auction_funnels")
        .insert({ name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-auction-funnels"] });
    },
  });
}

async function handleArrematadoAutomation(property: PreAuctionProperty) {
  // 1. Create property in main Kanban
  const { data: newProp, error: propError } = await supabase
    .from("properties")
    .insert({
      code: property.code,
      property_type: property.property_type,
      state: property.state,
      city: property.city,
      neighborhood: property.neighborhood,
      address: property.address,
      zip_code: property.zip_code,
      maps_url: property.maps_url,
      drive_url: property.drive_url,
      purchase_price: property.purchase_price,
      auction_date: property.auction_date,
      registration_number: property.registration_number,
      occupation_status: property.occupation_status,
      responsible_user_id: property.responsible_id,
      operation_responsible_id: property.operation_responsible_id,
      stage: 'documentacao',
      photo_url: property.photo_url
    } as any)
    .select()
    .single();

  if (propError) {
    console.error("Erro ao migrar imóvel:", propError);
    return;
  }

  // 2. Add activity log for the professional
  if (property.diligence_professional_id) {
    await supabase.from("activities").insert({
      property_id: newProp.id,
      description: `Diligência concluída por ${property.diligence_professional_id}. Amostras: ${property.diligence_samples}`,
      user_id: property.responsible_id,
      type: "Diligência"
    });

    // 3. Update professional status
    await supabase
      .from("city_contacts")
      .update({ has_served: true } as any)
      .eq("id", property.diligence_professional_id);
  }
}
