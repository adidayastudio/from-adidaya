/**
 * Profile API Route
 * 
 * GET - Get current user's profile
 */

import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/server/supabase";
import {
    getAuthenticatedUser,
    unauthorizedResponse,
    serverErrorResponse,
    successResponse
} from "@/lib/server/auth";

/**
 * GET /api/profile
 */
export async function GET(request: NextRequest) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const supabase = await createServerSupabase();

        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url, role, department, created_at')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error("Error fetching profile:", error);
            // Return minimal profile from auth if DB profile fails
            return successResponse({
                id: user.id,
                email: user.email
            });
        }

        return successResponse(data);
    } catch (e) {
        console.error("Profile GET error:", e);
        return serverErrorResponse("Internal server error");
    }
}
