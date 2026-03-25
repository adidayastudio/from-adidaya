import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fmgcvwximerhgjgctpsp.supabase.co";
const supabaseAnonKey = "sb_publishable_xG7rkz6EztqCnJhSxOxVow_mtP-udQQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Attempting to insert task...");
  // Get first project ID
  const { data: projs } = await supabase.from("projects").select("id").limit(1);
  if (!projs || projs.length === 0) {
    console.error("No projects found to link task to.");
    return;
  }
  const projectId = projs[0].id;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: "Test Task",
      project_id: projectId,
      status: "TODO",
      priority: "MEDIUM",
      deadline_date: "2026-12-31",
      created_by: null
    })
    .select();

  if (error) {
    console.error("Insert Error Details:");
    console.error("Message:", error.message);
    console.error("Details:", error.details);
    console.error("Hint:", error.hint);
    console.error("Code:", error.code);
  } else {
    console.log("Insert Success:", data);
  }
}

check();
