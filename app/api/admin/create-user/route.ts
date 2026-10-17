import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, fullName, role } = body;

        if (!email || !password || !fullName || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Verify that the requester is an admin
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                },
            }
        );

        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check user role
        const { data: userRole, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", authUser.id)
            .eq("role", "admin")
            .single();

        if (roleError || !userRole) {
            return NextResponse.json({ error: "Only admins can create users" }, { status: 403 });
        }

        // 2. Create User via Admin API
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error("SUPABASE_SERVICE_ROLE_KEY is missing");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Create the user in auth.users
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (createError) {
            console.error("Error creating user:", createError);
            return NextResponse.json({ error: createError.message }, { status: 500 });
        }

        if (!newUser.user) {
            return NextResponse.json({ error: "Failed to create user object" }, { status: 500 });
        }

        // 3. Update the profile and role
        // The trigger on_auth_user_created should handle initial profile, 
        // but we want to ensure the name and specific role are set correctly.
        
        // Update profile
        await supabaseAdmin
            .from("profiles")
            .update({ 
                full_name: fullName,
                email: email
            })
            .eq("id", newUser.user.id);

        // Assign the role (delete existing 'staff' if it was auto-assigned and different)
        if (role !== 'staff') {
             await supabaseAdmin
                .from("user_roles")
                .upsert({ user_id: newUser.user.id, role }, { onConflict: 'user_id,role' });
        } else {
            // Ensure staff is set (trigger might have done it, but let's be sure)
             await supabaseAdmin
                .from("user_roles")
                .upsert({ user_id: newUser.user.id, role: 'staff' }, { onConflict: 'user_id,role' });
        }

        return NextResponse.json({ 
            success: true, 
            user: {
                id: newUser.user.id,
                email: newUser.user.email,
                fullName
            }
        });

    } catch (err: any) {
        console.error("API Error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
