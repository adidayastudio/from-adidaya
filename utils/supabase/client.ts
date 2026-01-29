import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

    if (!url || !key) {
        console.error("❌ SUPABASE CLIENT ERROR: Missing Environment Variables");
        console.error("NEXT_PUBLIC_SUPABASE_URL:", url ? "Set" : "Missing");
        console.error("NEXT_PUBLIC_SUPABASE_KEY:", key ? "Set" : "Missing");

        // Return a dummy client to prevent crash
        return {
            auth: {
                getUser: async () => ({ data: { user: null }, error: null }),
                signInWithPassword: async () => ({ error: { message: "Missing Supabase Configuration (Env Vars)" } }),
                signOut: async () => ({ error: null }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            },
            from: () => ({
                select: () => ({
                    order: () => ({
                        limit: () => ({ data: [], error: { message: "Missing Supabase Configuration" } }),
                        data: [],
                        error: { message: "Missing Supabase Configuration" }
                    }),
                    single: () => ({ data: null, error: { message: "Missing Supabase Configuration" } }),
                    data: [],
                    error: { message: "Missing Supabase Configuration" }
                }),
            }),
        } as any;
    }

    return createBrowserClient(url, key);
}
