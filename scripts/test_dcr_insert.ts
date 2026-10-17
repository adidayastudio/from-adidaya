import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase
    .from("dcr_daily_reports")
    .insert({
      workspace_id: "00000000-0000-0000-0000-000000000000", // dummy uuid
      project_code: "TEST-PROJ",
      report_date: "2026-08-19",
      status: "draft"
    })
    .select();
  
  if (error) {
    console.log("❌ Test insert failed!");
    console.log("Error Details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
  } else {
    console.log("✅ Test insert success!", data);
  }
}

testInsert();
