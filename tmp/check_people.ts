import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fmgcvwximerhgjgctpsp.supabase.co";
const supabaseAnonKey = "sb_publishable_xG7rkz6EztqCnJhSxOxVow_mtP-udQQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Checking people status counts...");
  const { data: profiles, error } = await supabase.from("profiles").select("id, status");
  if (error) console.error("Error:", error);
  else {
    const counts = profiles.reduce((acc: any, p: any) => {
      const s = (p.status || "NULL").toUpperCase();
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    console.log("Status counts:", counts);
  }
}

check();
