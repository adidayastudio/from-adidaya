import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fmgcvwximerhgjgctpsp.supabase.co";
const supabaseAnonKey = "sb_publishable_xG7rkz6EztqCnJhSxOxVow_mtP-udQQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Fetching project_wbs_items...");
  const { data, error } = await supabase.from("project_wbs_items").select("id, wbs_code, title").limit(5);
  if (error) console.error("Error:", error);
  else {
    console.log("WBS Items found:", data.length);
    data.forEach((item: any) => {
      console.log(`ID: ${item.id} (${typeof item.id}), Code: ${item.wbs_code}, Title: ${item.title}`);
    });
  }
}

check();
