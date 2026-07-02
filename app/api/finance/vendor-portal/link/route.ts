import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/server/supabase";
import {
    getAuthenticatedUser,
    unauthorizedResponse,
    badRequestResponse,
    serverErrorResponse,
    successResponse
} from "@/lib/server/auth";

/**
 * POST /api/finance/vendor-portal/link
 * Links one or more purchasing requests to a vendor portal.
 * Body: { portal_id: string | null, request_ids: string[] }
 */
export async function POST(request: NextRequest) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const body = await request.json();
        const { portal_id, request_ids } = body;

        if (!request_ids || !Array.isArray(request_ids) || request_ids.length === 0) {
            return badRequestResponse("Missing or invalid field: request_ids must be a non-empty array");
        }

        const supabase = await createServerSupabase();

        const { error } = await supabase
            .from("purchasing_requests")
            .update({ vendor_portal_id: portal_id })
            .in("id", request_ids);

        if (error) {
            console.error("Error linking requests to vendor portal:", error);
            return serverErrorResponse("Failed to link requests to vendor portal");
        }

        return successResponse({ success: true, linked: request_ids.length });
    } catch (e) {
        console.error("Vendor Portal Link POST error:", e);
        return serverErrorResponse("Internal server error");
    }
}
