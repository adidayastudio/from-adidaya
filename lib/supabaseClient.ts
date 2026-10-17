import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase Client (Browser)
 * Uses @supabase/ssr to ensure session synchronization
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("⚠️ Missing Supabase environment variables - functionality may be limited");
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
