import { createClient } from 'https://esm.sh/@supabase/supabase-client@2.39.3'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugWebhooks() {
  console.log('Fetching latest botconversa webhooks...')
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('action', 'botconversa_webhook')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching logs:', error)
    return
  }

  data.forEach((log, i) => {
    console.log(`\n--- LOG ${i+1} (${log.created_at}) ---`)
    console.log('Payload:', JSON.stringify(log.changes?.payload, null, 2))
    console.log('Extracted:', JSON.stringify(log.changes?.extracted, null, 2))
  })
}

debugWebhooks()
