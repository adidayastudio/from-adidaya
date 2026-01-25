/**
 * Purchasing API Routes
 * 
 * GET  - List all purchasing requests with pagination
 * POST - Create a new purchasing request
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

// Explicit columns to select (no select('*'))
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

/**
 * GET /api/finance/purchasing
 * 
 * Query params:
 * - limit: number (default 50)
 * - offset: number (default 0)
 * - project_id: string (optional filter)
 * - approval_status: string (optional filter)
 * - my_requests: "true" to filter by current user
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
            .from("purchasing_requests")
            .select(PURCHASING_COLUMNS)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Optional filters
        const projectId = searchParams.get("project_id");
        if (projectId) {
            query = query.eq("project_id", projectId);
        }

        const approvalStatus = searchParams.get("approval_status");
        if (approvalStatus) {
            query = query.eq("approval_status", approvalStatus);
        }

        const myRequests = searchParams.get("my_requests");
        if (myRequests === "true") {
            query = query.eq("created_by", user.id);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching purchasing requests:", error);
            return serverErrorResponse("Failed to fetch purchasing requests");
        }

        return successResponse(data || []);
    } catch (e) {
        console.error("Purchasing GET error:", e);
        return serverErrorResponse("Internal server error");
    }
}

/**
 * POST /api/finance/purchasing
 * 
 * Body: PurchasingRequestPayload
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
        const { data: purchasingRequest, error: reqError } = await supabase
            .from("purchasing_requests")
            .insert([{
                ...requestData,
                created_by: user.id
            }])
            .select()
            .single();

        if (reqError) {
            console.error("Error creating purchasing request:", reqError);
            return serverErrorResponse("Failed to create purchasing request");
        }

        // 2. Create items if provided
        if (items && items.length > 0) {
            const itemsData = items.map((item: any) => ({
                request_id: purchasingRequest.id,
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
                console.error("Error creating purchasing items:", itemsError);
                // Optionally rollback the request here
            }
        }

        return createdResponse(purchasingRequest);
    } catch (e) {
        console.error("Purchasing POST error:", e);
        return serverErrorResponse("Internal server error");
    }
}
