/**
 * Server-side Supabase Client Utilities
 * 
 * Use createServerSupabase() for authenticated operations (uses session cookies)
 * Use createServiceClient() for admin operations (bypasses RLS)
 */

import { createClient } from "@supabase/supabase-js";

// Re-export the authenticated server client
export { createClient as createServerSupabase } from "@/utils/supabase/server";

/**
 * Creates a Supabase client using the service role key.
 * This bypasses Row Level Security - use with caution.
 * Only use for admin operations or when RLS is not needed.
 */
export function createServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        console.warn("⚠️ Missing SUPABASE_SERVICE_ROLE_KEY - using anon key instead");
        // Fallback to anon key if service role not available
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
        return createClient(url!, anonKey!);
    }

    return createClient(url, serviceKey);
}

// Alias for consistency with API routes
export { createServiceClient as createServerClient };
