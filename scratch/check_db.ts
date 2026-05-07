import { supabase } from "./src/integrations/supabase/client";

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
