import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/server/supabase";

// Columns we safely expose to the public vendor page
const PUBLIC_PURCHASING_COLUMNS = `
    id, 
    project_id, 
    date, 
    vendor, 
    description, 
    amount, 
    approval_status, 
    purchase_stage, 
    financial_status,
    payment_date, 
    notes,
    request_number,
    project:projects(id, project_name, project_code, project_number),
    items:purchasing_items(id, name, qty, unit, unit_price, total),
    invoices:purchasing_invoices(id, invoice_url, invoice_name, invoice_type, notes, created_at)
`;

/**
 * GET /api/finance/vendor-portal/by-token
 * Query param: token (UUID)
 * 
 * Public endpoint. Does NOT require authentication.
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json({ error: "Missing token" }, { status: 400 });
        }

        const supabase = await createServerSupabase();

        // 1. Fetch portal by token
        const { data: portal, error: portalError } = await supabase
            .from("vendor_portals")
            .select("*")
            .eq("token", token)
            .maybeSingle();

        if (portalError) {
            console.error("Error fetching vendor portal by token:", portalError);
            return NextResponse.json({ error: "Failed to query vendor portal" }, { status: 500 });
        }

        if (!portal) {
            return NextResponse.json({ error: "Invalid token or portal not found" }, { status: 404 });
        }

        // 2. Fetch linked purchasing requests
        const { data: requests, error: reqError } = await supabase
            .from("purchasing_requests")
            .select(PUBLIC_PURCHASING_COLUMNS)
            .eq("vendor_portal_id", portal.id)
            .order("date", { ascending: false });

        if (reqError) {
            console.error("Error fetching requests for vendor portal:", reqError);
            return NextResponse.json({ error: "Failed to fetch linked requests" }, { status: 500 });
        }

        return NextResponse.json({
            portal,
            requests: requests || []
        });
    } catch (e) {
        console.error("Vendor Portal by Token GET error:", e);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
