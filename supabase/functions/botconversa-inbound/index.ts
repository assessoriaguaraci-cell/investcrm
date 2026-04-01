import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log("--- WEBHOOK BOTCONVERSA INICIADO ---")
    const data = await req.json()

    // 1. Extração robusta de dados
    const leadName = data.full_name || data.name || data.first_name || data.Nome_do_Cliente || data.contact_name || "Lead WhatsApp"
    const leadPhone = data.phone || data.telefone || data.wa_id || data.contact_phone || data.subscriber_id || ""
    const searchCode = (data.property_code || data.imovel || data.property || data.codigo_imovel || "")
      .toString()
      .trim()
      .replace("@", "")
      .replace("{", "")
      .replace("}", "")
    
    console.log(`Corpo Recebido:`, JSON.stringify(data))
    console.log(`Extraído: Nome: ${leadName}, Fone: ${leadPhone}, Imóvel: ${searchCode}`)

    const cleanPhone = leadPhone ? String(leadPhone).replace(/\D/g, '') : null
    const clientName = leadName && leadName !== "@nome_do_contato" ? leadName : "Lead WhatsApp"

    // 2. Busca DETALHADA do imóvel (Lógica de Detetive)
    let propertyId = null;
    let propertyInfo = "";
    
    if (searchCode) {
      console.log(`Buscando imóvel com código: "${searchCode}"`)
      
      // Tentativa 1: Busca Exata
      let { data: propExact } = await supabaseClient
        .from('properties')
        .select('id, address, code')
        .eq('code', searchCode)
        .maybeSingle()

      if (propExact) {
        propertyId = propExact.id
        propertyInfo = propExact.address || propExact.code
        console.log("Encontrado por Busca Exata!")
      } else {
        // Tentativa 2: Busca por FINAL do código (LIKE %code)
        console.log("Não achou por exato. Tentando final do código...")
        let { data: propFuzzy } = await supabaseClient
          .from('properties')
          .select('id, address, code')
          .ilike('code', `%${searchCode}`)
          .maybeSingle()
        
        if (propFuzzy) {
          propertyId = propFuzzy.id
          propertyInfo = propFuzzy.address || propFuzzy.code
          console.log("Encontrado por Final do Código!")
        } else {
          // Tentativa 3: Busca CONTÉM (LIKE %code%)
          console.log("Não achou por final. Tentando busca global...")
          let { data: propGlobal } = await supabaseClient
            .from('properties')
            .select('id, address, code')
            .ilike('code', `%${searchCode}%`)
            .maybeSingle()
          
          if (propGlobal) {
            propertyId = propGlobal.id
            propertyInfo = propGlobal.address || propGlobal.code
            console.log("Encontrado por Busca Global!")
          }
        }
      }
    }

    // 3. Criar o Cliente no CRM
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .insert({
        full_name: clientName,
        phone: cleanPhone,
        whatsapp: cleanPhone,
        pipeline: 'inicial',
        stage: 'chegada_lead',
        temperature: 'morno',
        notes: searchCode ? `Interesse no imóvel: ${propertyInfo || searchCode}` : 'Vindo do Botconversa'
      })
      .select('id')
      .single()

    if (clientError) {
      console.error("Erro ao criar cliente:", clientError)
      throw clientError
    }

    // 4. Vincular Leads ao Imóvel
    if (client && propertyId) {
      const { error: linkError } = await supabaseClient
        .from('client_property_links')
        .insert({
          client_id: client.id,
          property_id: propertyId,
          status: 'interessado'
        })
      
      if (linkError) console.error("Erro no vínculo:", linkError)
      else console.log(`Sucesso! Lead vinculado ao imóvel ${propertyId}`)
    }

    console.log(`Lead salvo com sucesso em: Pipeline: inicial, Stage: chegada_lead`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        client_id: client?.id, 
        property_linked: !!propertyId, 
        found_property: propertyId ? propertyInfo : "NÃO ENCONTRADO",
        saved_location: {
          pipeline: "inicial",
          stage: "chegada_lead"
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("Erro Geral:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
