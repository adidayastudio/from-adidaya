import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/server/supabase";

/**
 * POST /api/finance/vendor-portal/upload-invoice
 * Public endpoint to allow vendors to associate an uploaded invoice with a request.
 * Body: { token: string, request_id: string, invoice_url: string, invoice_name: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, request_id, invoice_url, invoice_name } = body;

        if (!token || !request_id || !invoice_url) {
            return NextResponse.json({ error: "Missing required fields: token, request_id, invoice_url" }, { status: 400 });
        }

        const supabase = await createServerSupabase();

        // 1. Fetch portal by token
        const { data: portal, error: portalError } = await supabase
            .from("vendor_portals")
            .select("*")
            .eq("token", token)
            .maybeSingle();

        if (portalError || !portal) {
            return NextResponse.json({ error: "Invalid token or vendor portal not found" }, { status: 404 });
        }

        // 2. Fetch the request and verify it is linked to this portal
        const { data: reqData, error: reqError } = await supabase
            .from("purchasing_requests")
            .select("*")
            .eq("id", request_id)
            .maybeSingle();

        if (reqError || !reqData) {
            return NextResponse.json({ error: "Purchasing request not found" }, { status: 404 });
        }

        if (reqData.vendor_portal_id !== portal.id) {
            return NextResponse.json({ error: "Unauthorized: Request is not associated with this portal" }, { status: 403 });
        }

        // 3. Create the invoice record
        const { data: newInvoice, error: invError } = await supabase
            .from("purchasing_invoices")
            .insert([{
                request_id: request_id,
                invoice_url: invoice_url,
                invoice_name: invoice_name || "Invoice",
                invoice_type: "INVOICE",
                uploaded_by: null // Uploaded anonymously via portal
            }])
            .select()
            .single();

        if (invError) {
            console.error("Error creating purchasing invoice:", invError);
            return NextResponse.json({ error: "Failed to save invoice record" }, { status: 500 });
        }

        // 4. Update the purchasing request stage to INVOICED
        // For backward compatibility, also update invoice_url on the requests table if it's not already set
        const updatePayload: any = {
            purchase_stage: "INVOICED"
        };
        if (!reqData.invoice_url) {
            updatePayload.invoice_url = invoice_url;
        }

        const { error: updateError } = await supabase
            .from("purchasing_requests")
            .update(updatePayload)
            .eq("id", request_id);

        if (updateError) {
            console.error("Error updating request stage:", updateError);
            // Non-blocking, the invoice was saved successfully
        }

        return NextResponse.json({ success: true, invoice: newInvoice });
    } catch (e) {
        console.error("Vendor Portal upload-invoice error:", e);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
