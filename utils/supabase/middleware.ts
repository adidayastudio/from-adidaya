import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            request.cookies.set(name, value)
                        );
                        supabaseResponse = NextResponse.next({
                            request,
                        });
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, options)
                        );
                    },
                },
            }
        );

        // Do not run Supabase code on static files to save resources
        // e.g. /_next/static/, /favicon.ico, etc.
        // This is handled in middleware config matcher, but checking here explicitly if needed.

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (request.nextUrl.pathname.startsWith("/login") && user) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        const protectedRoutes = ["/dashboard", "/clock", "/crew", "/projects"];
        const isProtectedRoute = protectedRoutes.some((route) =>
            request.nextUrl.pathname.startsWith(route)
        );

        if (isProtectedRoute && !user) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        return supabaseResponse;
    } catch (e) {
        // If middleware fails, log it but don't break the app
        console.error("Middleware / Supabase Error:", e);
        return NextResponse.next({
            request,
        });
    }
}
