import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PreAuctionProperty, PreAuctionStage, PreAuctionFunnel } from "@/types/pre-auction";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/property-constants";

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

export function usePreAuctionProperties(funnelId?: string, diligenteId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pre_auction_properties" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pre-auction-properties"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]); // Reduced dependencies to prevent excessive reconnections

  return useQuery({
    queryKey: ["pre-auction-properties", funnelId, diligenteId],
    queryFn: async () => {
      let query = supabase
        .from("pre_auction_properties")
        .select("*, responsible:profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(5000);
      
      if (funnelId) {
        query = query.eq("funnel_id", funnelId);
      } else if (!diligenteId) {
        query = query.is("funnel_id", null);
      }

      if (diligenteId) {
        query = query.eq("diligence_professional_id", diligenteId);
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
      toast.success("Funil criado!");
    },
  });
}

export function useUpdatePreAuctionFunnel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from("pre_auction_funnels")
        .update({ name })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-auction-funnels"] });
      toast.success("Funil atualizado!");
    },
  });
}

export function useDeletePreAuctionFunnel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pre_auction_funnels")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-auction-funnels"] });
      toast.success("Funil excluído!");
    },
  });
}

export function useDeletePreAuctionProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pre_auction_properties")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-auction-properties"] });
      toast.success("Imóvel excluído com sucesso!");
    },
  });
}

async function handleArrematadoAutomation(property: PreAuctionProperty) {
  // 1. Create property in main Kanban (Pós-Arrematação)
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
      stage: 'pre_arrematacao', // Corrected stage name
      photo_url: property.photo_url,
      area_total: property.area_total,
      area_useful: property.area_useful,
      iptu_debts: property.iptu,
      condo_debts: property.condo_fees,
    } as any)
    .select()
    .single();

  if (propError) {
    console.error("Erro ao migrar imóvel:", propError);
    return;
  }

  // 2. Prepare Diligence History for Partner
  const diligenceNotes = `
--- DILIGÊNCIA REALIZADA: ${property.code} ---
Data: ${property.diligence_date ? new Date(property.diligence_date).toLocaleDateString() : 'N/A'}
Lance Atual: ${formatCurrency(property.current_bid)}
Valor Laudo: ${formatCurrency(property.appraisal_value)}
Valor Mercado: ${formatCurrency(property.market_value)}
Venda Pretendida: ${formatCurrency(property.listed_price)}
Status Diligência: ${property.status_diligence}
Status Mercado: ${property.status_market_analysis}
Status Débitos: ${property.status_debts}
Amostras: ${property.diligence_samples || 'N/A'}
Análise Segurança: ${property.security_analysis || 'N/A'}
Análise Transporte: ${property.transport_analysis || 'N/A'}
Análise Complementar: ${property.complementary_analysis || 'N/A'}
Conclusão: ${property.conclusion || 'N/A'}
Observações: ${property.notes || 'N/A'}
-------------------------------------------
  `;

  // 3. Add activity log
  await supabase.from("activities").insert({
    property_id: newProp.id,
    description: `Imóvel arrematado e migrado do Pré-Leilão. Diligência realizada por ${property.diligence_professional_id || 'N/A'}.`,
    user_id: property.responsible_id,
    type: "Sistema"
  });

  // 4. Update Partner (City Contact)
  if (property.diligence_professional_id) {
    // Get existing history
    const { data: partner } = await supabase
      .from("city_contacts")
      .select("diligence_history")
      .eq("id", property.diligence_professional_id)
      .single();

    const updatedHistory = (partner?.diligence_history || "") + diligenceNotes;

    await supabase
      .from("city_contacts")
      .update({ 
        has_served: true,
        diligence_history: updatedHistory
      } as any)
      .eq("id", property.diligence_professional_id);
  }
}
