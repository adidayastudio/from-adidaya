import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { createClient as createBearerClient } from "@supabase/supabase-js";

export async function createClient() {
    // The Expo frontend forwards its existing user JWT through the same-origin API proxy.
    // Preserve cookie auth for the current Next app and use caller identity (never service-role) for API requests.
    const authorization = (await headers()).get('authorization');
    if (authorization?.startsWith('Bearer ')) {
        const token = authorization.slice(7);
        const client = createBearerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
        );
        const getUser = client.auth.getUser.bind(client.auth);
        client.auth.getUser = (jwt?: string) => getUser(jwt || token);
        return client;
    }
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );
}
