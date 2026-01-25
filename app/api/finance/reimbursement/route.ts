/**
 * Reimbursement API Routes
 * 
 * GET  - List all reimbursement requests with pagination
 * POST - Create a new reimbursement request
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

// Explicit columns to select
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
    created_by,
    created_at,
    updated_at,
    project:projects(id, project_name, project_code),
    items:reimbursement_items(id, name, qty, unit, unit_price, total)
`;

/**
 * GET /api/finance/reimbursement
 */
export async function GET(request: NextRequest) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const supabase = await createServerSupabase();
        const searchParams = request.nextUrl.searchParams;

        // Pagination
        const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
        const offset = parseInt(searchParams.get("offset") || "0");

        // Build query
        let query = supabase
            .from("reimbursement_requests")
            .select(REIMBURSEMENT_COLUMNS)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Optional filters
        const projectId = searchParams.get("project_id");
        if (projectId) {
            query = query.eq("project_id", projectId);
        }

        const status = searchParams.get("status");
        if (status) {
            query = query.eq("status", status);
        }

        const myRequests = searchParams.get("my_requests");
        if (myRequests === "true") {
            query = query.eq("created_by", user.id);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching reimbursement requests:", error);
            return serverErrorResponse("Failed to fetch reimbursement requests");
        }

        return successResponse(data || []);
    } catch (e) {
        console.error("Reimbursement GET error:", e);
        return serverErrorResponse("Internal server error");
    }
}

/**
 * POST /api/finance/reimbursement
 */
export async function POST(request: NextRequest) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const body = await request.json();
        const { items, ...requestData } = body;

        // Validate required fields
        if (!requestData.project_id || !requestData.description || !requestData.amount) {
            return badRequestResponse("Missing required fields: project_id, description, amount");
        }

        const supabase = await createServerSupabase();

        // 1. Create the request
        const { data: reimburseRequest, error: reqError } = await supabase
            .from("reimbursement_requests")
            .insert([{
                ...requestData,
                user_id: user.id,
                created_by: user.id
            }])
            .select()
            .single();

        if (reqError) {
            console.error("Error creating reimbursement request:", reqError);
            return serverErrorResponse("Failed to create reimbursement request");
        }

        // 2. Create items if provided
        if (items && items.length > 0) {
            const itemsData = items.map((item: any) => ({
                reimbursement_id: reimburseRequest.id,
                name: item.name,
                qty: item.qty,
                unit: item.unit,
                unit_price: item.unitPrice || item.unit_price,
                total: item.total
            }));

            const { error: itemsError } = await supabase
                .from("reimbursement_items")
                .insert(itemsData);

            if (itemsError) {
                console.error("Error creating reimbursement items:", itemsError);
            }
        }

        return createdResponse(reimburseRequest);
    } catch (e) {
        console.error("Reimbursement POST error:", e);
        return serverErrorResponse("Internal server error");
    }
}
