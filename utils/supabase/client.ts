import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

    if (!url || !key) {
        console.error("❌ SUPABASE CLIENT ERROR: Missing Environment Variables");
        // ... (remaining error handling remains the same)
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

    // Resilience: Custom fetch with retry logic for "Load failed" (TypeErrors)
    const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        let retries = 0;
        const maxRetries = 3;
        const baseDelay = 500;

        while (true) {
            try {
                const response = await fetch(input, init);
                return response;
            } catch (error: any) {
                const isLoadFailed = error instanceof TypeError && (
                    error.message.includes("Load failed") ||
                    error.message.includes("Failed to fetch") ||
                    error.message.includes("NetworkError")
                );

                if (isLoadFailed && retries < maxRetries) {
                    retries++;
                    const delay = baseDelay * Math.pow(2, retries - 1);
                    console.warn(`⚠️ Supabase Fetch Retry (${retries}/${maxRetries}) after ${delay}ms:`, error.message);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw error;
            }
        }
    };

    return createBrowserClient(url, key, {
        global: {
            fetch: customFetch
        }
    });
}
