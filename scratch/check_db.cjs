const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://fcheeslldnywydwrzdqx.supabase.co";
const SUPABASE_KEY = "sb_publishable_-eLmo6kNFDSdASzFjqR7BA_JrZic7-E";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkProperties() {
    console.log("Iniciando busca completa...");
    const { data, error } = await supabase
        .from("pre_auction_properties")
        .select("*");
    
    if (error) {
        console.error("Erro ao buscar:", error);
        return;
    }
    
    console.log("Total de imóveis no banco:", data.length);
    if (data.length > 0) {
        console.table(data.map(p => ({
            id: p.id,
            code: p.code,
            stage: p.stage,
            funnel_id: p.funnel_id,
            created_at: p.created_at
        })));
    } else {
        console.log("Nenhum imóvel encontrado em nenhuma tabela.");
    }
}

checkProperties();
