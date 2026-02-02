/**
 * Fix ID Generation Type Cast Error
 * Fixes "operator does not exist: integer || integer" error
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const fixSQL = `
-- Fix generate_id_number Function
CREATE OR REPLACE FUNCTION generate_id_number(
    p_level_code INTEGER DEFAULT 0,
    p_dept_cluster INTEGER DEFAULT 0,
    p_pos_category INTEGER DEFAULT 0,
    p_join_date DATE DEFAULT CURRENT_DATE,
    p_custom_sequence INTEGER DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    v_year_suffix TEXT;
    v_sequence INTEGER;
    v_seq_str TEXT;
    v_id_number TEXT;
    v_exists BOOLEAN;
    v_level TEXT;
    v_dept TEXT;
    v_pos TEXT;
BEGIN
    IF p_level_code IS NULL OR p_level_code < 0 THEN p_level_code := 0;
    ELSIF p_level_code > 5 THEN p_level_code := 5; END IF;
    
    IF p_dept_cluster IS NULL OR p_dept_cluster < 0 THEN p_dept_cluster := 0;
    ELSIF p_dept_cluster > 9 THEN p_dept_cluster := 9; END IF;
    
    IF p_pos_category IS NULL OR p_pos_category < 0 THEN p_pos_category := 0;
    ELSIF p_pos_category > 9 THEN p_pos_category := 9; END IF;
    
    IF p_join_date IS NULL THEN p_join_date := CURRENT_DATE; END IF;
    
    v_level := p_level_code::TEXT;
    v_dept := p_dept_cluster::TEXT;
    v_pos := p_pos_category::TEXT;
    v_year_suffix := TO_CHAR(p_join_date, 'YY');
    
    IF p_custom_sequence IS NOT NULL THEN
        IF p_custom_sequence < 1 OR p_custom_sequence > 999 THEN
            RAISE EXCEPTION 'Custom sequence must be between 1 and 999';
        END IF;
        v_seq_str := LPAD(p_custom_sequence::TEXT, 3, '0');
        v_id_number := v_level || v_dept || v_pos || v_year_suffix || v_seq_str;
        SELECT EXISTS(SELECT 1 FROM profiles WHERE id_number = v_id_number) INTO v_exists;
        IF v_exists THEN RAISE EXCEPTION 'ID Number % already exists', v_id_number; END IF;
        v_sequence := p_custom_sequence;
    ELSE
        UPDATE employee_sequences SET last_sequence = last_sequence + 1 WHERE id = 1 RETURNING last_sequence INTO v_sequence;
    END IF;
    
    v_seq_str := LPAD(v_sequence::TEXT, 3, '0');
    v_id_number := v_level || v_dept || v_pos || v_year_suffix || v_seq_str;
    RETURN v_id_number;
END;
$$ LANGUAGE plpgsql;
`;

const fixTriggerSQL = `
CREATE OR REPLACE FUNCTION update_employee_ids_trigger_func() RETURNS TRIGGER AS $$
DECLARE
    v_level_code INTEGER;
    v_dept_cluster INTEGER;
    v_pos_category INTEGER;
    v_level_text TEXT;
    v_dept_text TEXT;
    v_pos_text TEXT;
BEGIN
    IF NEW.level_id IS NOT NULL THEN
        SELECT level_code INTO v_level_code FROM organization_levels WHERE id = NEW.level_id;
    END IF;
    IF NEW.department_id IS NOT NULL THEN
        SELECT cluster_code INTO v_dept_cluster FROM organization_departments WHERE id = NEW.department_id;
    END IF;
    IF NEW.position_id IS NOT NULL THEN
        SELECT category_code INTO v_pos_category FROM organization_positions WHERE id = NEW.position_id;
    END IF;
    
    v_level_code := COALESCE(v_level_code, 0);
    v_dept_cluster := COALESCE(v_dept_cluster, 0);
    v_pos_category := COALESCE(v_pos_category, 0);
    
    v_level_text := v_level_code::TEXT;
    v_dept_text := v_dept_cluster::TEXT;
    v_pos_text := v_pos_category::TEXT;
    
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
        NEW.department_id IS DISTINCT FROM OLD.department_id OR
        NEW.position_id IS DISTINCT FROM OLD.position_id OR
        NEW.level_id IS DISTINCT FROM OLD.level_id OR
        NEW.join_date IS DISTINCT FROM OLD.join_date
    )) THEN
        IF NEW.id_number IS NOT NULL THEN
            DECLARE
                v_existing_seq INTEGER;
                v_year_suffix TEXT;
            BEGIN
                v_existing_seq := SUBSTRING(NEW.id_number FROM 6 FOR 3)::INTEGER;
                v_year_suffix := TO_CHAR(COALESCE(NEW.join_date, CURRENT_DATE), 'YY');
                NEW.id_number := v_level_text || v_dept_text || v_pos_text || v_year_suffix || LPAD(v_existing_seq::TEXT, 3, '0');
            END;
        END IF;
        NEW.id_code := calculate_id_code(NEW.id_number, NEW.department_id, NEW.position_id, NEW.level_id);
    ELSIF TG_OP = 'UPDATE' AND NEW.id_number IS NOT NULL AND NEW.id_code IS NULL THEN
        NEW.id_code := calculate_id_code(NEW.id_number, NEW.department_id, NEW.position_id, NEW.level_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

async function run() {
    console.log("🔧 Fixing ID generation functions...\n");

    // Execute the fix for generate_id_number
    console.log("1️⃣ Updating generate_id_number function...");
    const { error: err1 } = await supabase.rpc('exec_sql', { query: fixSQL }).single();

    if (err1) {
        // If RPC doesn't exist, try raw query via pg
        console.log("⚠️ RPC exec_sql not available, using direct SQL method...");

        // Alternative: use Supabase's built-in SQL function
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        if (error) {
            console.log("Connection test failed:", error.message);
        }

        console.log("\n📋 Please run this SQL in Supabase Dashboard > SQL Editor:");
        console.log("─".repeat(60));
        console.log(fixSQL);
        console.log("─".repeat(60));
        console.log("\n📋 Then run this SQL:");
        console.log("─".repeat(60));
        console.log(fixTriggerSQL);
        console.log("─".repeat(60));
        return;
    }

    console.log("2️⃣ Updating trigger function...");
    const { error: err2 } = await supabase.rpc('exec_sql', { query: fixTriggerSQL }).single();

    if (err2) {
        console.error("❌ Error:", err2.message);
        return;
    }

    console.log("\n✅ ID generation functions fixed successfully!");
}

run().catch(console.error);
