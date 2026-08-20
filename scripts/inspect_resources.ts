import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectColumns() {
  const { data, error } = await supabase
    .from("pricing_resources")
    .select("*")
    .limit(1);
  
  if (error) {
    console.error("Error fetching record:", error);
  } else {
    console.log("📋 First record keys in pricing_resources:", Object.keys(data[0] || {}));
    console.log("Record sample:", data[0]);
  }
}

inspectColumns();
