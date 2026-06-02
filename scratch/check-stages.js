import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Parse .env manually
const envContent = fs.readFileSync(".env", "utf8");
const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*["']?([^"\n']+)["']?/);
const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*["']?([^"\n']+)["']?/);

if (!urlMatch || !keyMatch) {
  console.error("Could not parse .env file");
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseAnonKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: stages, error } = await supabase
    .from("kanban_stages")
    .select("*")
    .eq("funnel_type", "client")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error getting stages:", error);
    return;
  }

  console.log("Kanban stages in DB:", stages);
}

run();
