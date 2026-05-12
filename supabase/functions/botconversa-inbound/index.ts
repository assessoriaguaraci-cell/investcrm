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

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

  // DEBUG: Se for GET, retorna os últimos logs de auditoria
  if (req.method === 'GET') {
    const { data: logs, error: logError } = await supabaseClient
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'botconversa_webhook')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (logError) return new Response(JSON.stringify({ error: logError.message }), { headers: corsHeaders, status: 500 });
    
    return new Response(JSON.stringify({ 
      count: logs?.length || 0,
      last_logs: logs || [],
      message: logs?.length ? "Logs encontrados" : "Nenhum log de webhook encontrado no banco ainda."
    }), { 
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

    const findValue = (keys: string[], obj: any = data, depth = 0): any => {
      if (!obj || typeof obj !== 'object' || depth > 5) return null;
      
      // Tenta no nível atual
      for (const k of keys) {
        if (obj[k]) return obj[k];
      }
      
      // Procura recursivamente em todos os objetos filhos e arrays
      for (const k in obj) {
        if (obj[k] && typeof obj[k] === 'object') {
          if (Array.isArray(obj[k])) {
            // Se for array, procura por objetos que tenham chaves úteis
            for (const item of obj[k]) {
              if (item && typeof item === 'object') {
                // Tenta achar em propriedades do item ou se o item é um par chave-valor {key: '...', value: '...'}
                const itemKey = item.key || item.name || item.slug;
                const itemVal = item.value || item.val;
                if (itemKey && itemVal && keys.includes(itemKey)) return itemVal;
                
                const found = findValue(keys, item, depth + 1);
                if (found) return found;
              }
            }
          } else {
            const found = findValue(keys, obj[k], depth + 1);
            if (found) return found;
          }
        }
      }
      return null;
    }

    // Tenta capturar nome de várias formas (prioriza campos do contato)
    leadName = findValue([
      'full_name', 'contact_name', 'nome', 'first_name', 'name', 
      'Nome_do_Cliente', 'nome_completo', 'first_name_contact', '@first_name',
      'peopleName', 'contact.name', 'subscriber.name', 'display_name',
      'Nome', 'nomeCompleto', 'cliente_nome'
    ]) || leadName
    
    // Tenta capturar telefone
    leadPhone = findValue([
      'phone', 'telefone', 'id', 'wa_id', 'contact_phone', 'fone', 
      'subscriber_id', 'whatsapp', 'celular', 'phone_number', '@phone',
      'peoplePhone', 'contact.phone', 'subscriber.phone', 'key',
      'Telefone', 'celular_cliente'
    ]) || ""
    
    // Tenta capturar mensagem/código
    rawMessage = findValue(['message', 'text', 'last_message', 'msg', 'conteudo', 'last_text', 'mensagem']) || ""
    searchCode = findValue(['property_code', 'codigo', 'imovel', 'code', 'codigo_imovel', 'sku', 'etiqueta', 'tag', 'imovelcod']) || ""

    // Se não achou código nos campos específicos, procura dentro de TODAS as tags/etiquetas
    const allTags = findValue(['tags', 'labels', 'etiquetas'])
    if (!searchCode && allTags) {
      const tagArray = Array.isArray(allTags) ? allTags : String(allTags).split(',')
      for (const tag of tagArray) {
        const cleanTag = String(tag).trim()
        // Procura por 4 dígitos na tag
        const tagMatch = cleanTag.match(/\d{4}$/) || cleanTag.match(/^\d{4}$/) || cleanTag.match(/\d{4}/)
        if (tagMatch) {
          searchCode = tagMatch[0]
          break
        }
      }
    }

    // Se ainda não veio código, tenta extrair da mensagem (IL-0000-0000 ou CÓDIGO XXXX ou apenas os números de 4 dígitos)
    if (!searchCode && rawMessage) {
      const msgStr = String(rawMessage).toUpperCase()
      const codeMatch = 
        msgStr.match(/IL-\d{4}-\d{4}/) || 
        msgStr.match(/CÓDIGO\s*(\d{4,})/) || 
        msgStr.match(/CODIGO\s*(\d{4,})/) ||
        msgStr.match(/(\d{4,})$/) ||
        msgStr.match(/(\d{4,})/)
      
      if (codeMatch) {
        searchCode = codeMatch[1] || codeMatch[0]
      }
    }

    // Tenta capturar o ID do BotConversa em várias camadas
    const botconversaId = findValue(['chat_id', 'subscriber_id', 'id', 'id_contato', 'contact_id', 'subscriber.id', 'contact.id']) || ""

    const cleanPhone = leadPhone ? String(leadPhone).replace(/\D/g, '') : null
    
    // Se o nome for uma variável do bot ou estiver vazio, usa o telefone como nome temporário
    const isBotVariable = leadName && (leadName.includes('{') || leadName.includes('@'))
    const finalName = (leadName && !isBotVariable && leadName !== "Lead WhatsApp") 
                      ? leadName 
                      : (cleanPhone ? `Lead ${cleanPhone}` : "Lead WhatsApp")

    // 2. BUSCAR CLIENTE EXISTENTE (Pelo Telefone)
    let client: any = null;
    if (cleanPhone) {
      const { data: existingClient } = await supabaseClient
        .from('clients')
        .select('id, notes')
        .eq('phone', cleanPhone)
        .maybeSingle()
      
      client = existingClient
    }

    if (client) {
      // ATUALIZA CLIENTE EXISTENTE (Adiciona nova nota se necessário)
      const newNotes = client.notes?.includes(rawMessage) 
        ? client.notes 
        : `${client.notes}\n\nNova Mensagem: ${rawMessage}\nRef: ${searchCode}`

      await supabaseClient
        .from('clients')
        .update({ notes: newNotes })
        .eq('id', client.id)
    } else {
      // CRIA NOVO CLIENTE
      const { data: newClient, error: clientError } = await supabaseClient
        .from('clients')
        .insert({
          full_name: finalName,
          phone: cleanPhone,
          whatsapp: cleanPhone,
          pipeline: 'inicial',
          stage: 'chegada_lead',
          temperature: 'quente',
          notes: `BotConversa: ${rawMessage}\nImóvel Ref: ${searchCode}`
        })
        .select('id')
        .single()

      if (clientError) throw clientError
      client = newClient
    }

    // 3. Vincular Imóvel (se houver código)
    if (client && searchCode) {
      const cleanCode = String(searchCode).trim();
      
      // Busca exaustiva pelo imóvel: 
      // 1. Busca exata pelo código
      // 2. Busca pelo código terminando com o número (ex: IL-9152)
      const { data: prop } = await supabaseClient
        .from('properties')
        .select('id, responsible_user_id')
        .or(`code.eq.${cleanCode},code.ilike.%-${cleanCode},code.ilike.%${cleanCode}`)
        .limit(1)
        .maybeSingle();

      if (prop) {
        // Verifica se o vínculo já existe para não dar erro
        const { data: existingLink } = await supabaseClient
          .from('client_property_links')
          .select('id')
          .eq('client_id', client.id)
          .eq('property_id', prop.id)
          .maybeSingle();

        if (!existingLink) {
          await supabaseClient.from('client_property_links').insert({
            client_id: client.id,
            property_id: prop.id,
            status: 'interessado'
          });
        }

        // Garante que o responsável do cliente seja o mesmo do imóvel
        if (prop.responsible_user_id) {
          await supabaseClient
            .from('clients')
            .update({ responsible_user_id: prop.responsible_user_id })
            .eq('id', client.id)
            .is('responsible_user_id', null);
        }
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
