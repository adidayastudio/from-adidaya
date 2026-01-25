/**
 * Single Purchasing Request API Routes
 * 
 * GET    - Get a single purchasing request by ID
 * PUT    - Update a purchasing request
 * PATCH  - Partial update (status changes, etc.)
 * DELETE - Delete a purchasing request
 */

import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/server/supabase";
import {
    getAuthenticatedUser,
    unauthorizedResponse,
    badRequestResponse,
    notFoundResponse,
    serverErrorResponse,
    successResponse
} from "@/lib/server/auth";

// Explicit columns
const PURCHASING_COLUMNS = `
    id, 
    project_id, 
    date, 
    vendor, 
    description, 
    type, 
    subcategory,
    amount, 
    approval_status, 
    purchase_stage, 
    financial_status,
    source_of_fund_id, 
    payment_date, 
    invoice_url, 
    notes,
    beneficiary_bank, 
    beneficiary_number, 
    beneficiary_name,
    created_by, 
    created_at, 
    updated_at,
    rejection_reason,
    revision_reason,
    payment_proof_url,
    approved_amount,
    project:projects(id, project_name, project_code),
    items:purchasing_items(id, name, qty, unit, unit_price, total)
`;

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/finance/purchasing/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const { id } = await params;
        const supabase = await createServerSupabase();

        const { data, error } = await supabase
            .from("purchasing_requests")
            .select(PURCHASING_COLUMNS)
            .eq("id", id)
            .single();

        if (error || !data) {
            return notFoundResponse("Purchasing request not found");
        }

        return successResponse(data);
    } catch (e) {
        console.error("Purchasing GET [id] error:", e);
        return serverErrorResponse("Internal server error");
    }
}

/**
 * PUT /api/finance/purchasing/[id]
 * Full update of a purchasing request
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const { items, ...requestData } = body;

        const supabase = await createServerSupabase();

        // 1. Update the request
        const { error: reqError } = await supabase
            .from("purchasing_requests")
            .update({
                ...requestData,
                updated_at: new Date().toISOString()
            })
            .eq("id", id);

        if (reqError) {
            console.error("Error updating purchasing request:", reqError);
            return serverErrorResponse("Failed to update purchasing request");
        }

        // 2. Update items if provided (delete and recreate)
        if (items !== undefined) {
            // Delete existing items
            await supabase
                .from("purchasing_items")
                .delete()
                .eq("request_id", id);

            // Insert new items
            if (items && items.length > 0) {
                const itemsData = items.map((item: any) => ({
                    request_id: id,
                    name: item.name,
                    qty: item.qty,
                    unit: item.unit,
                    unit_price: item.unitPrice || item.unit_price,
                    total: item.total
                }));

                const { error: itemsError } = await supabase
                    .from("purchasing_items")
                    .insert(itemsData);

                if (itemsError) {
                    console.error("Error updating purchasing items:", itemsError);
                }
            }
        }

        // Fetch and return updated record
        const { data: updated } = await supabase
            .from("purchasing_requests")
            .select(PURCHASING_COLUMNS)
            .eq("id", id)
            .single();

        return successResponse(updated);
    } catch (e) {
        console.error("Purchasing PUT error:", e);
        return serverErrorResponse("Internal server error");
    }
}

/**
 * PATCH /api/finance/purchasing/[id]
 * Partial update (status changes, etc.)
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
            .from("purchasing_requests")
            .update({
                ...body,
                updated_at: new Date().toISOString()
            })
            .eq("id", id);

        if (error) {
            console.error("Error patching purchasing request:", error);
            return serverErrorResponse("Failed to update purchasing request");
        }

        return successResponse({ success: true });
    } catch (e) {
        console.error("Purchasing PATCH error:", e);
        return serverErrorResponse("Internal server error");
    }
}

/**
 * DELETE /api/finance/purchasing/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const { id } = await params;
        const supabase = await createServerSupabase();

        // Delete items first
        await supabase
            .from("purchasing_items")
            .delete()
            .eq("request_id", id);

        // Then delete the request
        const { error } = await supabase
            .from("purchasing_requests")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting purchasing request:", error);
            return serverErrorResponse("Failed to delete purchasing request");
        }

        return successResponse({ success: true });
    } catch (e) {
        console.error("Purchasing DELETE error:", e);
        return serverErrorResponse("Internal server error");
    }
}
