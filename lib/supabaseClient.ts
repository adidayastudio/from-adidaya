import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Client
 * Uses environment variables for connection
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("⚠️ Missing Supabase environment variables - functionality may be limited");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
