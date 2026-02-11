import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the request is authorized (from cron/service role)
    const authHeader = req.headers.get("Authorization");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!authHeader || (!authHeader.includes(serviceRoleKey) && !authHeader.includes(supabaseAnonKey))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all properties in pos_venda stage
    const { data: properties, error: propError } = await supabase
      .from("properties")
      .select("id, code, responsible_user_id")
      .eq("stage", "pos_venda");

    if (propError) throw propError;
    if (!properties || properties.length === 0) {
      return new Response(JSON.stringify({ message: "No pos_venda properties found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For each property, check if a reminder was already created this week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    let created = 0;

    for (const prop of properties) {
      // Check existing reminder this week
      const { data: existing } = await supabase
        .from("activities")
        .select("id")
        .eq("property_id", prop.id)
        .eq("activity_type", "lembrete_relatorio_semanal")
        .gte("created_at", weekStart.toISOString())
        .limit(1);

      if (existing && existing.length > 0) continue;

      const userId = prop.responsible_user_id;
      if (!userId) continue;

      // Create the reminder activity
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 2); // due in 2 days

      await supabase.from("activities").insert({
        description: `Enviar relatório semanal do imóvel ${prop.code} no grupo do WhatsApp`,
        activity_type: "lembrete_relatorio_semanal",
        property_id: prop.id,
        created_by: userId,
        responsible_user_id: userId,
        due_date: dueDate.toISOString().split("T")[0],
        status: "pendente",
      });

      created++;
    }

    return new Response(JSON.stringify({ message: `Created ${created} reminders` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
