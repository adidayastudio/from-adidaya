/**
 * Funding Sources API Routes
 * 
 * GET  - List funding sources for a workspace
 * POST - Create/Update a funding source
 */

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

const FUNDING_SOURCE_COLUMNS = `
    id,
    workspace_id,
    name,
    type,
    provider,
    currency,
    balance,
    account_number,
    position,
    is_active,
    is_archived,
    created_at,
    updated_at
`;

/**
 * GET /api/finance/funding-sources
 */
export async function GET(request: NextRequest) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const supabase = await createServerSupabase();
        const searchParams = request.nextUrl.searchParams;

        const workspaceId = searchParams.get("workspace_id");
        if (!workspaceId) {
            return badRequestResponse("workspace_id is required");
        }

        const { data, error } = await supabase
            .from("funding_sources")
            .select(FUNDING_SOURCE_COLUMNS)
            .eq("workspace_id", workspaceId)
            .order("position", { ascending: true })
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching funding sources:", error);
            return serverErrorResponse("Failed to fetch funding sources");
        }

        return successResponse(data || []);
    } catch (e) {
        console.error("Funding sources GET error:", e);
        return serverErrorResponse("Internal server error");
    }
}

/**
 * POST /api/finance/funding-sources
 * Creates or updates a funding source (upsert)
 */
export async function POST(request: NextRequest) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const body = await request.json();
        const { id, ...sourceData } = body;

        if (!sourceData.workspace_id) {
            return badRequestResponse("workspace_id is required");
        }

        const supabase = await createServerSupabase();

        const dbSource: any = {
            workspace_id: sourceData.workspace_id,
            name: sourceData.name,
            type: sourceData.type,
            provider: sourceData.provider,
            currency: sourceData.currency || "IDR",
            balance: sourceData.balance || 0,
            account_number: sourceData.account_number,
            position: sourceData.position ?? 0,
            is_active: sourceData.is_active ?? true,
            is_archived: sourceData.is_archived ?? false,
            updated_at: new Date().toISOString()
        };

        let data, error;

        if (id && !id.startsWith("fs-")) {
            // UPDATE
            const result = await supabase
                .from("funding_sources")
                .update(dbSource)
                .eq("id", id)
                .select()
                .single();
            data = result.data;
            error = result.error;
        } else {
            // INSERT
            const result = await supabase
                .from("funding_sources")
                .insert(dbSource)
                .select()
                .single();
            data = result.data;
            error = result.error;
        }

        if (error) {
            console.error("Error saving funding source:", error);
            return serverErrorResponse("Failed to save funding source");
        }

        return id ? successResponse(data) : createdResponse(data);
    } catch (e) {
        console.error("Funding sources POST error:", e);
        return serverErrorResponse("Internal server error");
    }
}

/**
 * PATCH /api/finance/funding-sources
 * Bulk update positions
 */
export async function PATCH(request: NextRequest) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const body = await request.json();
        const { items } = body;

        if (!items || !Array.isArray(items)) {
            return badRequestResponse("items array is required");
        }

        const supabase = await createServerSupabase();

        const updates = items.map((item: { id: string; position: number }) => ({
            id: item.id,
            position: item.position,
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from("funding_sources")
            .upsert(updates as any);

        if (error) {
            console.error("Error updating positions:", error);
            return serverErrorResponse("Failed to update positions");
        }

        return successResponse({ success: true });
    } catch (e) {
        console.error("Funding sources PATCH error:", e);
        return serverErrorResponse("Internal server error");
    }
}
