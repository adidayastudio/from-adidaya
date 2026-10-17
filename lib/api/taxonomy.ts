import { createClient } from "@supabase/supabase-js";

export interface TaxonomyIndexRecord {
  id?: string;
  project_id?: string;
  parent_id: string;
  code: string;
  title: string;
  is_custom?: boolean;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const getSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};

export async function fetchProjectTaxonomyConfig(projectId?: string): Promise<TaxonomyIndexRecord[]> {
  try {
    const supabase = getSupabaseClient();
    let query = supabase.from("project_taxonomy_indexes").select("*");
    if (projectId) {
      query = query.eq("project_id", projectId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching taxonomy config:", err);
    return [];
  }
}

export async function saveTaxonomyConfig(records: TaxonomyIndexRecord[], projectId?: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const payload = records.map((r) => ({
      ...r,
      project_id: projectId || r.project_id || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("project_taxonomy_indexes").upsert(payload, { onConflict: "id" });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error saving taxonomy config to database:", err);
    return false;
  }
}
