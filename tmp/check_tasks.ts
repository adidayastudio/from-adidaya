import dotenv from "dotenv";
import path from "path";

// Explicitly load .env.local first
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function check() {
  console.log("Loading Supabase client dynamically to bypass import hoisting...");
  const { supabase } = await import("../lib/supabaseClient");
  
  console.log("Starting tasks query diagnostic test...");
  
  // Test basic tasks table access
  const { data: basicData, error: basicErr } = await supabase
    .from("tasks")
    .select("id, title")
    .limit(1);

  if (basicErr) {
    console.error("❌ Basic tasks query failed:", basicErr);
    return;
  }
  console.log("✅ Basic tasks query succeeded! Count fetched:", basicData?.length);

  // Test full task queries with joined relations
  console.log("Testing full relational join query...");
  const { data: fullData, error: fullErr } = await supabase
    .from("tasks")
    .select(`
        *,
        projects ( project_code, project_name ),
        task_assignees ( user_id ),
        project_wbs_items ( wbs_code, title )
    `)
    .limit(5);

  if (fullErr) {
    console.error("❌ Full relational join query failed:", {
      message: fullErr.message,
      details: fullErr.details,
      hint: fullErr.hint,
      code: fullErr.code
    });
    return;
  }
  
  console.log("✅ Full relational join query succeeded! Sample task:", JSON.stringify(fullData[0], null, 2));
}

check();
