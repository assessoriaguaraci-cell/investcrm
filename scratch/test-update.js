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

console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  // Get one client
  const { data: clients, error: getError } = await supabase
    .from("clients")
    .select("id, full_name, stage, cancellation_reason")
    .limit(1);

  if (getError) {
    console.error("Error getting clients:", getError);
    return;
  }

  console.log("Found client:", clients[0]);

  if (!clients[0]) {
    console.log("No clients found in the database.");
    return;
  }

  console.log("Trying to update client with cancellation_reason...");
  const { data: updated, error: updateError } = await supabase
    .from("clients")
    .update({ cancellation_reason: "test reason" })
    .eq("id", clients[0].id)
    .select();

  if (updateError) {
    console.error("Update failed as expected! Error:", updateError);
  } else {
    console.log("Update succeeded! Updated client:", updated);
  }
}

run();
