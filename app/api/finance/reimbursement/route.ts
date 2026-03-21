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
    priority,
    target_date,
    created_by,
    created_at,
    updated_at,
    request_number,
    approved_by_name,
    project:projects(id, project_name, project_code, project_number),
    items:reimbursement_items(id, name, qty, unit, unit_price, total),
    existingInvoices:reimbursement_invoices(id, invoice_url, invoice_name, invoice_type, notes, created_at)
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
        const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 10000);
        const offset = parseInt(searchParams.get("offset") || "0");

        // Filters
        const projectId = searchParams.get("project_id");
        const status = searchParams.get("status");
        const myRequests = searchParams.get("my_requests") === "true";
        const q = searchParams.get("q");
        const month = searchParams.get("month"); // 1-12
        const year = searchParams.get("year");   // 2026, etc.
        const startDateParam = searchParams.get("start_date");
        const endDateParam = searchParams.get("end_date");
        const category = searchParams.get("category");

        let matchingRequestIds: string[] = [];
        if (q) {
            const { data: itemMatches } = await supabase
                .from("reimbursement_items")
                .select("reimbursement_id")
                .ilike("name", `%${q}%`);
            if (itemMatches && itemMatches.length > 0) {
                matchingRequestIds = Array.from(new Set(itemMatches.map(i => i.reimbursement_id)));
            }
        }
        
        let matchingProjectIds: string[] = [];
        if (q) {
            const { data: projectMatches } = await supabase
                .from("projects")
                .select("id")
                .or(`project_name.ilike.%${q}%,project_code.ilike.%${q}%`);
            if (projectMatches && projectMatches.length > 0) {
                matchingProjectIds = projectMatches.map(p => p.id);
            }
        }
        
        let qNum: number | null = null;
        if (q) {
            const parsed = parseInt(q.replace(/\D/g, ''), 10);
            if (!isNaN(parsed)) qNum = parsed;
        }

        // Build base query for data
        let query = supabase
            .from("reimbursement_requests")
            .select(REIMBURSEMENT_COLUMNS, { count: 'exact' });

        // Build base query for stats
        let statsQuery = supabase
            .from("reimbursement_requests")
            .select("amount, status");

        // Apply shared filters
        // Apply shared filters
        const applyFilters = (qBuilder: any, includeStatus: boolean = true) => {
            let b = qBuilder;
            if (projectId && projectId !== "ALL") {
                const projectIds = projectId.split(",");
                if (projectIds.length > 1) {
                    b = b.in("project_id", projectIds);
                } else {
                    b = b.eq("project_id", projectId);
                }
            }
            if (includeStatus && status && status !== "ALL") {
                if (status === "PENDING") {
                    b = b.in("status", ["PENDING", "NEED_REVISION"]);
                } else {
                    b = b.eq("status", status);
                }
            }
            if (myRequests) b = b.eq("created_by", user.id);
            if (category && category !== "ALL") {
                const categories = category.split(",");
                if (categories.length > 1) {
                    b = b.in("category", categories);
                } else {
                    b = b.eq("category", category);
                }
            }

            if (q) {
                let orString = `description.ilike.%${q}%,beneficiary_name.ilike.%${q}%,subcategory.ilike.%${q}%,notes.ilike.%${q}%`;
                
                if (qNum !== null) {
                    orString += `,request_number.eq.${qNum}`;
                }

                if (matchingRequestIds.length > 0) {
                    const idsStr = matchingRequestIds.slice(0, 100).join(',');
                    orString += `,id.in.(${idsStr})`;
                }
                
                b = b.or(orString);
            }

            // Date filtering
            if (startDateParam && endDateParam) {
                b = b.gte("date", startDateParam).lte("date", endDateParam);
            } else if (month && year && month !== "ALL") {
                const yearInt = parseInt(year);
                const monthInt = parseInt(month);
                const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

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
            console.error("Error fetching reimbursement requests:", dataRes.error);
            return serverErrorResponse("Failed to fetch reimbursement requests");
        }

        // Calculate Stats
        const allItems = statsRes.data || [];
        const stats = {
            totalCount: allItems.length,
            totalAmount: allItems.reduce((acc, i) => acc + (i.amount || 0), 0),
            pendingCount: allItems.filter(i => i.status === "PENDING" || i.status === "NEED_REVISION").length,
            pendingAmount: allItems.filter(i => i.status === "PENDING" || i.status === "NEED_REVISION").reduce((acc, i) => acc + (i.amount || 0), 0),
            approvedCount: allItems.filter(i => i.status === "APPROVED").length,
            approvedAmount: allItems.filter(i => i.status === "APPROVED").reduce((acc, i) => acc + (i.amount || 0), 0),
            paidCount: allItems.filter(i => i.status === "PAID").length,
            paidAmount: allItems.filter(i => i.status === "PAID").reduce((acc, i) => acc + (i.amount || 0), 0),
            rejectedCount: allItems.filter(i => i.status === "REJECTED").length,
            rejectedAmount: allItems.filter(i => i.status === "REJECTED").reduce((acc, i) => acc + (i.amount || 0), 0),
        };

        return successResponse({
            data: dataRes.data || [],
            count: dataRes.count || 0,
            stats: stats
        });
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
        const { items, invoice_urls, existing_invoice_ids, ...requestData } = body;



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

        // 3. Create invoices if provided
        if (invoice_urls && invoice_urls.length > 0) {
            const invoicesData = invoice_urls.map((inv: any) => ({
                request_id: reimburseRequest.id,
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

        return createdResponse(reimburseRequest);
    } catch (e) {
        console.error("Reimbursement POST error:", e);
        return serverErrorResponse("Internal server error");
    }
}
