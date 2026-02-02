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
    items:purchasing_items(id, name, qty, unit, unit_price, total),
    invoices:purchasing_invoices(id, invoice_url, invoice_name, invoice_type, notes, created_at)
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

        // Filters
        const projectId = searchParams.get("project_id");
        const approvalStatus = searchParams.get("approval_status");
        const myRequests = searchParams.get("my_requests") === "true";
        const q = searchParams.get("q");
        const month = searchParams.get("month"); // 1-12
        const year = searchParams.get("year");   // 2026, etc.

        // Build base query for data
        let query = supabase
            .from("purchasing_requests")
            .select(PURCHASING_COLUMNS, { count: 'exact' });

        // Build base query for stats (no limit/offset)
        let statsQuery = supabase
            .from("purchasing_requests")
            .select("amount, approval_status, financial_status");

        // Apply shared filters
        const applyFilters = (qBuilder: any, includeStatus: boolean = true) => {
            let b = qBuilder;
            if (projectId && projectId !== "ALL") b = b.eq("project_id", projectId);

            if (includeStatus && approvalStatus && approvalStatus !== "ALL") {
                if (approvalStatus === "PAID") {
                    b = b.eq("financial_status", "PAID");
                } else if (approvalStatus === "APPROVED") {
                    b = b.eq("approval_status", "APPROVED").neq("financial_status", "PAID");
                } else if (approvalStatus === "SUBMITTED") {
                    b = b.or("approval_status.eq.SUBMITTED,approval_status.eq.NEED_REVISION");
                } else {
                    b = b.eq("approval_status", approvalStatus);
                }
            }

            if (myRequests) b = b.eq("created_by", user.id);

            if (q) {
                b = b.or(`description.ilike.%${q}%,vendor.ilike.%${q}%`);
            }

            // Date filtering (skip if month is "ALL")
            if (month && year && month !== "ALL") {
                const yearInt = parseInt(year);
                const monthInt = parseInt(month);
                const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

                // Use literal date parts to avoid timezone shifts from .toISOString()
                const lastDay = new Date(yearInt, monthInt, 0).getDate();
                const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

                b = b.gte("date", startDate).lte("date", endDate);
            }

            return b;
        };

        query = applyFilters(query, true);
        statsQuery = applyFilters(statsQuery, false);

        // Fetch Data + Stats
        const [dataRes, statsRes] = await Promise.all([
            query
                .order("date", { ascending: false })
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1),
            statsQuery
        ]);

        if (dataRes.error) {
            console.error("Error fetching purchasing requests:", dataRes.error);
            return serverErrorResponse("Failed to fetch purchasing requests");
        }

        // Calculate Stats
        const allItems = statsRes.data || [];
        const stats = {
            totalCount: allItems.length,
            totalAmount: allItems.reduce((acc, i) => acc + (i.amount || 0), 0),
            pendingCount: allItems.filter(i => i.approval_status === "SUBMITTED" || i.approval_status === "NEED_REVISION").length,
            pendingAmount: allItems.filter(i => i.approval_status === "SUBMITTED" || i.approval_status === "NEED_REVISION").reduce((acc, i) => acc + (i.amount || 0), 0),
            approvedCount: allItems.filter(i => i.approval_status === "APPROVED" && i.financial_status !== "PAID").length,
            approvedAmount: allItems.filter(i => i.approval_status === "APPROVED" && i.financial_status !== "PAID").reduce((acc, i) => acc + (i.amount || 0), 0),
            paidCount: allItems.filter(i => i.financial_status === "PAID").length,
            paidAmount: allItems.filter(i => i.financial_status === "PAID").reduce((acc, i) => acc + (i.amount || 0), 0),
            rejectedCount: allItems.filter(i => i.approval_status === "REJECTED").length,
            rejectedAmount: allItems.filter(i => i.approval_status === "REJECTED").reduce((acc, i) => acc + (i.amount || 0), 0),
        };

        return successResponse({
            data: dataRes.data || [],
            count: dataRes.count || 0,
            stats: stats
        });
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
        const { items, invoice_urls, existing_invoice_ids, ...requestData } = body;

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
            }
        }

        // 3. Create invoices if provided
        if (invoice_urls && invoice_urls.length > 0) {
            const invoicesData = invoice_urls.map((inv: any) => ({
                request_id: purchasingRequest.id,
                invoice_url: inv.invoice_url,
                invoice_name: inv.invoice_name,
                invoice_type: 'INVOICE',
                uploaded_by: user.id
            }));

            const { error: invoicesError } = await supabase
                .from("purchasing_invoices")
                .insert(invoicesData);

            if (invoicesError) {
                console.error("Error creating purchasing invoices:", invoicesError);
            }
        }

        return createdResponse(purchasingRequest);
    } catch (e) {
        console.error("Purchasing POST error:", e);
        return serverErrorResponse("Internal server error");
    }
}
