/**
 * Single Funding Source API Routes
 */

import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/server/supabase";
import {
    getAuthenticatedUser,
    unauthorizedResponse,
    serverErrorResponse,
    successResponse
} from "@/lib/server/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * DELETE /api/finance/funding-sources/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const { id } = await params;
        const supabase = await createServerSupabase();

        const { error } = await supabase
            .from("funding_sources")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting funding source:", error);
            return serverErrorResponse("Failed to delete funding source");
        }

        return successResponse({ success: true });
    } catch (e) {
        console.error("Funding source DELETE error:", e);
        return serverErrorResponse("Internal server error");
    }
}

/**
 * PATCH /api/finance/funding-sources/[id]
 * Toggle archive or active status
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const supabase = await createServerSupabase();

        const { error } = await supabase
            .from("funding_sources")
            .update({
                ...body,
                updated_at: new Date().toISOString()
            })
            .eq("id", id);

        if (error) {
            console.error("Error updating funding source:", error);
            return serverErrorResponse("Failed to update funding source");
        }

        return successResponse({ success: true });
    } catch (e) {
        console.error("Funding source PATCH error:", e);
        return serverErrorResponse("Internal server error");
    }
}
