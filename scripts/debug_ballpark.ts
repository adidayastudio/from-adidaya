
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugData() {
    console.log("Debugging Data...");

    // 1. Fetch Disciplines
    const { data: disciplines, error: dErr } = await supabase.from("disciplines").select("*");
    if (dErr) console.error("Error fetching disciplines:", dErr);
    else {
        console.log("Disciplines found:");
        console.table(disciplines.map(d => ({ id: d.id, code: d.code, name: d.name_en })));
    }

    // 2. Fetch Class Discipline Values
    const { data: values, error: vErr } = await supabase.from("class_discipline_values").select("*");
    if (vErr) console.error("Error fetching values:", vErr);
    else {
        console.log("Values found (first 10):");
        console.table(values.slice(0, 10).map(v => ({
            class_id: v.class_id,
            discipline_code: v.discipline_code,
            cost: v.cost_per_m2,
            pct: v.percentage
        })));
    }
}

debugData();
