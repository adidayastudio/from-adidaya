/**
 * Single Reimbursement Request API Routes
 */

import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/server/supabase";
import {
    getAuthenticatedUser,
    unauthorizedResponse,
    notFoundResponse,
    serverErrorResponse,
    successResponse
} from "@/lib/server/auth";

const REIMBURSEMENT_COLUMNS = `
    id,
    user_id,
    project_id,
    category,
    subcategory,
    date,
    description,
    amount,
    status,
    invoice_url,
    notes,
    details,
    beneficiary_bank,
    beneficiary_number,
    beneficiary_name,
    revision_reason,
    rejection_reason,
    approved_amount,
    payment_date,
    payment_proof_url,
    source_of_fund_id,
    target_date,
    created_by,
    approved_by_name,
    created_at,
    updated_at,
    request_number,
    project_number,
    project:projects(id, project_name, project_code, project_number),
    items:reimbursement_items(id, name, qty, unit, unit_price, total),
    existingInvoices:reimbursement_invoices(id, invoice_url, invoice_name, invoice_type, notes, created_at)
`;

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/finance/reimbursement/[id]
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
            .from("reimbursement_requests")
            .select(REIMBURSEMENT_COLUMNS)
            .eq("id", id)
            .single();

        if (error || !data) {
            return notFoundResponse("Reimbursement request not found");
        }

        return successResponse(data);
    } catch (e) {
        console.error("Reimbursement GET [id] error:", e);
        return serverErrorResponse("Internal server error");
    }
}

/**
 * PUT /api/finance/reimbursement/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const { items, invoice_urls, existing_invoice_ids, ...requestData } = body;



        const supabase = await createServerSupabase();

        // 1. Update the request
        const { error: reqError } = await supabase
            .from("reimbursement_requests")
            .update({
                ...requestData,
                updated_at: new Date().toISOString()
            })
            .eq("id", id);

        if (reqError) {
            console.error("Error updating reimbursement request:", reqError);
            return serverErrorResponse("Failed to update reimbursement request");
        }

        // 2. Update items if provided
        if (items !== undefined) {
            await supabase
                .from("reimbursement_items")
                .delete()
                .eq("reimbursement_id", id);

            if (items && items.length > 0) {
                const itemsData = items.map((item: any) => ({
                    reimbursement_id: id,
                    name: item.name,
                    qty: item.qty,
                    unit: item.unit,
                    unit_price: item.unitPrice || item.unit_price,
                    total: item.total
                }));

                await supabase
                    .from("reimbursement_items")
                    .insert(itemsData);
            }
        }

        // 3. Update invoices - remove ones not in existing_invoice_ids, add new ones
        if (existing_invoice_ids !== undefined || invoice_urls !== undefined) {
            // Delete invoices not in the existing IDs list (user removed them)
            if (existing_invoice_ids && Array.isArray(existing_invoice_ids)) {
                await supabase
                    .from("reimbursement_invoices")
                    .delete()
                    .eq("request_id", id)
                    .not("id", "in", `(${existing_invoice_ids.filter((i: string) => i !== 'legacy').join(',')})`);
            }

            // Insert new invoices
            if (invoice_urls && invoice_urls.length > 0) {
                const invoicesData = invoice_urls.map((inv: any) => ({
                    request_id: id,
                    invoice_url: inv.invoice_url,
                    invoice_name: inv.invoice_name,
                    invoice_type: 'RECEIPT',
                    uploaded_by: user.id
                }));

                const { error: invoicesError } = await supabase
                    .from("reimbursement_invoices")
                    .insert(invoicesData);

                if (invoicesError) {
                    console.error("Error creating reimbursement invoices:", invoicesError);
                }
            }
        }

        // Fetch and return updated record
        const { data: updated } = await supabase
            .from("reimbursement_requests")
            .select(REIMBURSEMENT_COLUMNS)
            .eq("id", id)
            .single();

        return successResponse(updated);
    } catch (e) {
        console.error("Reimbursement PUT error:", e);
        return serverErrorResponse("Internal server error");
    }
}

/**
 * PATCH /api/finance/reimbursement/[id]
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
            .from("reimbursement_requests")
            .update({
                ...body,
                updated_at: new Date().toISOString()
            })
            .eq("id", id);

        if (error) {
            console.error("Error patching reimbursement request:", error);
            return serverErrorResponse("Failed to update reimbursement request");
        }

        return successResponse({ success: true });
    } catch (e) {
        console.error("Reimbursement PATCH error:", e);
        return serverErrorResponse("Internal server error");
    }
}

/**
 * DELETE /api/finance/reimbursement/[id]
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
            .from("reimbursement_items")
            .delete()
            .eq("reimbursement_id", id);

        // Then delete the request
        const { error } = await supabase
            .from("reimbursement_requests")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting reimbursement request:", error);
            return serverErrorResponse("Failed to delete reimbursement request");
        }

        return successResponse({ success: true });
    } catch (e) {
        console.error("Reimbursement DELETE error:", e);
        return serverErrorResponse("Internal server error");
    }
}
