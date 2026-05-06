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

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // DEBUG: Se for GET, retorna os últimos logs de auditoria
  if (req.method === 'GET') {
    const { data: logs } = await supabaseClient
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'botconversa_webhook')
      .order('created_at', { ascending: false })
      .limit(5)
    
    return new Response(JSON.stringify(logs), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }

  if (req.method === 'GET') {
    const { data: logs } = await supabaseClient
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'botconversa_webhook')
      .order('created_at', { ascending: false })
      .limit(10)
    
    return new Response(JSON.stringify(logs), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }

  try {
    const data = await req.json()
    console.log("DADOS RECEBIDOS:", JSON.stringify(data))

    // Log de Auditoria
    await supabaseClient.from('audit_logs').insert({
      entity_type: 'botconversa_webhook',
      entity_id: '00000000-0000-0000-0000-000000000000',
      action: 'receive_webhook',
      changes: data
    })

    // 1. BUSCA EXAUSTIVA (Deep Scan)
    // Procuramos em qualquer campo que contenha palavras-chave
    let leadName = "Lead WhatsApp"
    let leadPhone = ""
    let rawMessage = ""
    let searchCode = ""

    const findValue = (keys: string[]) => {
      for (const k of keys) {
        if (data[k]) return data[k]
      }
      return null
    }

    // Tenta capturar nome de várias formas
    leadName = findValue([
      'full_name', 'contact_name', 'nome', 'first_name', 'name', 
      'Nome_do_Cliente', 'nome_completo', 'first_name_contact', '@first_name',
      'peopleName'
    ]) || leadName
    
    if (data.first_name && data.last_name) {
      leadName = `${data.first_name} ${data.last_name}`
    } else if (data.first_name) {
      leadName = data.first_name
    }

    // Tenta capturar telefone
    leadPhone = findValue([
      'phone', 'telefone', 'id', 'wa_id', 'contact_phone', 'fone', 
      'subscriber_id', 'whatsapp', 'celular', 'phone_number', '@phone',
      'peoplePhone'
    ]) || ""
    
    // Tenta capturar mensagem/código
    rawMessage = findValue(['message', 'text', 'last_message', 'msg', 'conteudo', 'last_text', 'mensagem']) || ""
    searchCode = findValue(['property_code', 'codigo', 'imovel', 'code', 'codigo_imovel', 'sku', 'etiqueta', 'tag', 'imovelcod']) || ""

    // Se não veio código, tenta extrair da mensagem (IL-0000-0000 ou CÓDIGO XXXX ou apenas os números de 4 dígitos)
    if (!searchCode && rawMessage) {
      const msgStr = String(rawMessage).toUpperCase()
      const codeMatch = 
        msgStr.match(/IL-\d{4}-\d{4}/) || 
        msgStr.match(/CÓDIGO\s*(\d{4,})/) || 
        msgStr.match(/CODIGO\s*(\d{4,})/) ||
        msgStr.match(/(\d{4,})$/) ||
        msgStr.match(/(\d{4,})/)
      
      if (codeMatch) {
        // Se pegou o grupo de captura (apenas números), usa ele, senão pega o match inteiro
        searchCode = codeMatch[1] || codeMatch[0]
      }
    }

    const cleanPhone = leadPhone ? String(leadPhone).replace(/\D/g, '') : null
    const finalName = (leadName && !String(leadName).startsWith("@") && leadName !== "Lead WhatsApp") 
                      ? leadName 
                      : (cleanPhone || "Lead WhatsApp")

    // 2. Criar Cliente
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .insert({
        full_name: finalName,
        phone: cleanPhone,
        whatsapp: cleanPhone,
        pipeline: 'inicial',
        stage: 'chegada_lead',
        temperature: 'morno',
        notes: `BotConversa: ${rawMessage}\nImóvel Ref: ${searchCode}`
      })
      .select('id')
      .single()

    if (clientError) throw clientError

    // 3. Vincular Imóvel (se houver código)
    if (client && searchCode) {
      const { data: prop } = await supabaseClient
        .from('properties')
        .ilike('code', `%${searchCode}%`)
        .maybeSingle()

      if (prop) {
        await supabaseClient.from('client_property_links').insert({
          client_id: client.id,
          property_id: prop.id,
          status: 'interessado'
        })
      }
    }

    return new Response(JSON.stringify({ success: true, id: client?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err) {
    console.error("ERRO WEBHOOK:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
