import { supabase } from "./lib/supabaseClient";

async function check() {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error fetching task:", error);
    return;
  }

  console.log("Existing task sample:", JSON.stringify(data[0], null, 2));
}

check();
