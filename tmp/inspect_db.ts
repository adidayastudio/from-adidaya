import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fmgcvwximerhgjgctpsp.supabase.co";
const supabaseAnonKey = "sb_publishable_xG7rkz6EztqCnJhSxOxVow_mtP-udQQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Checking 'tasks' table...");
  const { data: tasks, error: taskErr } = await supabase.from("tasks").select("*").limit(1);
  if (taskErr) console.error("Error tasks:", taskErr);
  else {
    console.log("Tasks row found:", tasks.length > 0);
    if (tasks.length > 0) console.log("Tasks columns:", Object.keys(tasks[0]));
  }

  console.log("\nChecking 'project_tasks' table...");
  const { data: pTasks, error: pTaskErr } = await supabase.from("project_tasks").select("*").limit(1);
  if (pTaskErr) console.error("Error project_tasks:", pTaskErr);
  else {
    console.log("Project_tasks row found:", pTasks.length > 0);
    if (pTasks.length > 0) console.log("Project_tasks columns:", Object.keys(pTasks[0]));
  }
}

check();
