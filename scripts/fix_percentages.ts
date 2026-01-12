
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

async function fixPercentages() {
    console.log("Fixing Percentages based on Class E (Basic)...");

    // 1. Fetch Classes to find 'Basic' or 'E'
    const { data: classes } = await supabase.from("classes").select("*");
    if (!classes) {
        console.error("No classes found.");
        return;
    }

    // Find Class E (try by class_code 'E' or 'Basic')
    const basicClass = classes.find(c => c.class_code === 'E' || c.description?.toLowerCase().includes('basic'));

    if (!basicClass) {
        console.error("Class E (Basic) not found.");
        return;
    }

    console.log(`Found Source Class: ${basicClass.class_code} (${basicClass.description})`);

    // 2. Fetch Values for Basic Class
    const { data: values } = await supabase
        .from("class_discipline_values")
        .select("*")
        .eq("class_id", basicClass.id);

    if (!values || values.length === 0) {
        console.error("No values found for Basic class.");
        return;
    }

    // 3. Calculate Total and Percentages
    const totalCost = values.reduce((sum, v) => sum + parseFloat(v.cost_per_m2), 0);
    console.log(`Total Cost for ${basicClass.class_code}: ${totalCost}`);

    if (totalCost === 0) {
        console.error("Total cost is 0, cannot calculate percentages.");
        return;
    }

    const percentageMap: Record<string, number> = {};
    values.forEach(v => {
        percentageMap[v.discipline_code] = (parseFloat(v.cost_per_m2) / totalCost) * 100;
    });

    console.log("Calculated Percentages:", percentageMap);

    // 4. Update ALL classes with these percentages
    // We need to fetch all class_discipline_values and update them
    const { data: allValues } = await supabase.from("class_discipline_values").select("*");

    const updates: any[] = [];
    allValues?.forEach(v => {
        const targetPct = percentageMap[v.discipline_code] || 0;
        updates.push({
            ...v,
            percentage: targetPct,
            updated_at: new Date().toISOString()
        });
    });

    if (updates.length > 0) {
        const { error } = await supabase.from("class_discipline_values").upsert(updates);
        if (error) {
            console.error("Error updating percentages:", error);
        } else {
            console.log(`Successfully updated ${updates.length} rows with default percentages.`);
        }
    }
}

fixPercentages();
