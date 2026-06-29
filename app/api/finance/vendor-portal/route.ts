import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/server/supabase";
import {
    getAuthenticatedUser,
    unauthorizedResponse,
    badRequestResponse,
    serverErrorResponse,
    successResponse,
    createdResponse
} from "@/lib/server/auth";

/**
 * GET /api/finance/vendor-portal
 * Optional query param: vendor_name (exact match or case-insensitive search)
 */
export async function GET(request: NextRequest) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const supabase = await createServerSupabase();
        const searchParams = request.nextUrl.searchParams;
        const vendorName = searchParams.get("vendor_name");

        let query = supabase.from("vendor_portals").select("*");

        if (vendorName) {
            query = query.ilike("vendor_name", vendorName.trim());
        }

        const { data, error } = await query.order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching vendor portals:", error);
            return serverErrorResponse("Failed to fetch vendor portals");
        }

        return successResponse(data || []);
    } catch (e) {
        console.error("Vendor Portal GET error:", e);
        return serverErrorResponse("Internal server error");
    }
}

/**
 * POST /api/finance/vendor-portal
 * Body: { vendor_name: string }
 */
export async function POST(request: NextRequest) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const body = await request.json();
        const { vendor_name } = body;

        if (!vendor_name || !vendor_name.trim()) {
            return badRequestResponse("Missing required field: vendor_name");
        }

        const supabase = await createServerSupabase();

        // Check if a portal with this vendor_name already exists to prevent duplicate key error
        const { data: existingPortal } = await supabase
            .from("vendor_portals")
            .select("*")
            .ilike("vendor_name", vendor_name.trim())
            .maybeSingle();

        if (existingPortal) {
            return successResponse(existingPortal); // Just return existing portal
        }

        const { data: newPortal, error } = await supabase
            .from("vendor_portals")
            .insert([{ vendor_name: vendor_name.trim() }])
            .select()
            .single();

        if (error) {
            console.error("Error creating vendor portal:", error);
            return serverErrorResponse("Failed to create vendor portal");
        }

        return createdResponse(newPortal);
    } catch (e) {
        console.error("Vendor Portal POST error:", e);
        return serverErrorResponse("Internal server error");
    }
}

/**
 * DELETE /api/finance/vendor-portal
 * Query param: id (UUID of vendor portal)
 */
export async function DELETE(request: NextRequest) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get("id");

        if (!id) {
            return badRequestResponse("Missing required field: id");
        }

        const supabase = await createServerSupabase();

        const { error } = await supabase
            .from("vendor_portals")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting vendor portal:", error);
            return serverErrorResponse("Failed to delete vendor portal");
        }

        return successResponse({ success: true });
    } catch (e) {
        console.error("Vendor Portal DELETE error:", e);
        return serverErrorResponse("Internal server error");
    }
}

