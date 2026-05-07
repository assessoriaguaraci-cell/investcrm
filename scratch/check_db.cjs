const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://fcheeslldnywydwrzdqx.supabase.co";
const SUPABASE_KEY = "sb_publishable_-eLmo6kNFDSdASzFjqR7BA_JrZic7-E";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkProperties() {
    const { data, error } = await supabase
        .from("pre_auction_properties")
        .select("id, code, stage, funnel_id, created_at");
    
    if (error) {
        console.error("Erro ao buscar:", error);
        return;
    }
    
    console.log("Imóveis encontrados no banco:", data.length);
    console.table(data);
}

checkProperties();
