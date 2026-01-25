/**
 * Beneficiary Accounts API Routes
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

const BENEFICIARY_COLUMNS = `
    id,
    bank_name,
    account_number,
    account_name,
    alias,
    is_global,
    created_by,
    created_at
`;

/**
 * GET /api/finance/beneficiary-accounts
 */
export async function GET(request: NextRequest) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const supabase = await createServerSupabase();

        const { data, error } = await supabase
            .from("finance_beneficiary_accounts")
            .select(BENEFICIARY_COLUMNS)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching beneficiary accounts:", error);
            return serverErrorResponse("Failed to fetch beneficiary accounts");
        }

        return successResponse(data || []);
    } catch (e) {
        console.error("Beneficiary accounts GET error:", e);
        return serverErrorResponse("Internal server error");
    }
}

/**
 * POST /api/finance/beneficiary-accounts
 */
export async function POST(request: NextRequest) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const body = await request.json();

        if (!body.bank_name || !body.account_number || !body.account_name) {
            return badRequestResponse("Missing required fields: bank_name, account_number, account_name");
        }

        const supabase = await createServerSupabase();

        const { data, error } = await supabase
            .from("finance_beneficiary_accounts")
            .insert([{
                bank_name: body.bank_name,
                account_number: body.account_number,
                account_name: body.account_name,
                alias: body.alias,
                is_global: body.is_global ?? true,
                created_by: user.id
            }])
            .select()
            .single();

        if (error) {
            console.error("Error creating beneficiary account:", error);
            return serverErrorResponse("Failed to create beneficiary account");
        }

        return createdResponse(data);
    } catch (e) {
        console.error("Beneficiary accounts POST error:", e);
        return serverErrorResponse("Internal server error");
    }
}
