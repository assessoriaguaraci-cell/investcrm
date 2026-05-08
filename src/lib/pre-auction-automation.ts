import { supabase } from "@/integrations/supabase/client";
import { PreAuctionProperty } from "@/types/pre-auction";

export async function runPreAuctionAutoChecklist(propertyId: string, values: Partial<PreAuctionProperty>) {
  // Fetch existing checklist items for this property in pre_arrematacao stage
  const { data: items } = await supabase
    .from("property_checklist_items")
    .select("id, task_name, completed")
    .eq("property_id", propertyId)
    .eq("stage", "pre_arrematacao");

  if (!items || items.length === 0) return;

  const updates: Promise<any>[] = [];

  const checkTask = (taskName: string, condition: boolean) => {
    const item = items.find(i => i.task_name === taskName);
    if (item && item.completed !== condition) {
      updates.push(
        supabase
          .from("property_checklist_items")
          .update({ 
            completed: condition,
            completed_at: condition ? new Date().toISOString() : null
          })
          .eq("id", item.id)
      );
    }
  };

  // 1. Entrada de Oportunidade
  checkTask("Grupo de análise criado", !!values.group_created);
  checkTask("Validação de endereço", !!(values.address || values.zip_code || values.city));
  checkTask("Responsável atribuído", !!(values.responsible_id || values.operation_responsible_id));

  // 2. Documentos
  checkTask("Matrícula", !!values.registration_number);
  checkTask("Edital e laudo", !!(values.appraisal_value && Number(values.appraisal_value) > 0));
  checkTask("Ações judiciais", !!(values.legal_analysis && values.legal_analysis.length > 5));

  // 3. Débitos
  checkTask("IPTU", !!(values.iptu && Number(values.iptu) > 0));
  checkTask("ITBI", !!((values as any).itbi && Number((values as any).itbi) > 0));
  checkTask("Condomínio", !!(values.condo_fees && Number(values.condo_fees) > 0));

  // 4. Diligência
  checkTask("Confirmar ocupação", !!values.occupation_status);
  checkTask("Dados do ocupante", !!values.occupant_contact);
  checkTask("Fotos externas do imóvel", !!values.photo_url);
  checkTask("Análise da região", !!(values.security_analysis || values.transport_analysis));

  if (updates.length > 0) {
    console.log(`Auto-checking ${updates.length} items for property ${propertyId}`);
    await Promise.all(updates);
  }
}
