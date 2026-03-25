import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fmgcvwximerhgjgctpsp.supabase.co";
const supabaseAnonKey = "sb_publishable_xG7rkz6EztqCnJhSxOxVow_mtP-udQQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Fetching first profile...");
  const { data: profiles, error } = await supabase.from("profiles").select("id, full_name").limit(1);
  if (error) console.error("Error:", error);
  else console.log("Profile found:", JSON.stringify(profiles[0], null, 2));
}

check();
