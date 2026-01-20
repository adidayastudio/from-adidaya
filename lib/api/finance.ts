import { createClient } from "@/utils/supabase/client";
import { FundingSource, FundingSourceType, BankProvider } from "@/lib/types/finance-types";

const supabase = createClient();

export interface BeneficiaryAccount {
    id: string;
    bank_name: string;
    account_number: string;
    account_name: string;
    alias?: string;
    is_global: boolean;
    created_by: string;
}

// -- FETCHING --

export async function fetchFundingSources(workspaceId: string): Promise<FundingSource[]> {
    const result = await (supabase
        .from("funding_sources")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false }) as any);

    const { data, error } = result;

    if (error) {
        console.error("Error fetching funding sources:", error);
        return [];
    }

    return (data || []).map(mapDbToFundingSource);
}

// -- SAVING --

export async function upsertFundingSource(source: Partial<FundingSource> & { workspace_id: string }): Promise<FundingSource | null> {
    const dbSource: any = {
        workspace_id: source.workspace_id,
        name: source.name,
        type: source.type,
        provider: source.provider,
        currency: source.currency || "IDR",
        balance: source.balance || 0,
        account_number: source.account_number,
        position: source.position ?? 0,
        is_active: source.is_active ?? true,
        is_archived: source.is_archived ?? false,
        updated_at: new Date().toISOString()
    };

    // Add ID if updating and it's a real UUID
    if (source.id && !source.id.startsWith("fs-")) {
        dbSource.id = source.id;
    }

    let data, error;

    if (dbSource.id) {
        // UPDATE
        const result = await (supabase
            .from("funding_sources")
            .update(dbSource)
            .eq("id", dbSource.id)
            .select()
            .single() as any);
        data = result.data;
        error = result.error;
    } else {
        // INSERT
        // Remove ID from object if it's undefined to let DB handle generation
        delete dbSource.id;

        const result = await (supabase
            .from("funding_sources")
            .insert(dbSource)
            .select()
            .single() as any);
        data = result.data;
        error = result.error;
    }

    if (error) {
        console.error("Error saving funding source:", error);
        throw error;
    }

    return mapDbToFundingSource(data);
}

export async function updateFundingSourcePositions(items: { id: string; position: number }[]): Promise<boolean> {
    const updates = items.map(item => ({
        id: item.id,
        position: item.position,
        updated_at: new Date().toISOString()
    }));

    const result = await (supabase
        .from("funding_sources")
        .upsert(updates as any) as any);
    const { error } = result;

    if (error) {
        console.error("Error updating positions:", error);
        return false;
    }
    return true;
}

// -- ACTIONS --

export async function deleteFundingSource(id: string): Promise<boolean> {
    const response = await (supabase
        .from("funding_sources")
        .delete()
        .eq("id", id) as any);

    if (response.error) {
        console.error("Error deleting funding source:", response.error);
        return false;
    }
    return true;
}

export async function toggleFundingSourceArchive(id: string, isArchived: boolean): Promise<boolean> {
    const response = await (supabase
        .from("funding_sources")
        .update({ is_archived: isArchived })
        .eq("id", id) as any);

    if (response.error) {
        console.error("Error archiving funding source:", response.error);
        return false;
    }
    return true;
}

export async function toggleFundingSourceActive(id: string, isActive: boolean): Promise<boolean> {
    const response = await (supabase
        .from("funding_sources")
        .update({ is_active: isActive })
        .eq("id", id) as any);

    if (response.error) {
        console.error("Error toggling funding source status:", response.error);
        return false;
    }
    return true;
}


// -- BENEFICIARY ACCOUNTS --

export async function fetchBeneficiaryAccounts(): Promise<BeneficiaryAccount[]> {
    const result = await (supabase
        .from("finance_beneficiary_accounts")
        .select("*")
        .order("created_at", { ascending: false }) as any);

    const { data, error } = result;

    if (error) {
        console.error("Error fetching beneficiary accounts:", error);
        return [];
    }

    console.log("[DEBUG] fetchBeneficiaryAccounts returned:", data?.length, "accounts");

    return (data || []).map((row: any) => ({
        id: row.id,
        bank_name: row.bank_name,
        account_number: row.account_number,
        account_name: row.account_name,
        alias: row.alias,
        is_global: row.is_global,
        created_by: row.created_by
    }));
}

export async function saveBeneficiaryAccount(account: {
    bank_name: string;
    account_number: string;
    account_name: string;
    alias?: string;
    is_global?: boolean;
    created_by: string;
}): Promise<BeneficiaryAccount | null> {
    const { data, error } = await supabase
        .from("finance_beneficiary_accounts")
        .insert([{
            ...account,
            is_global: account.is_global ?? true // Default to true for shared
        }])
        .select()
        .single();

    if (error) {
        console.error("Error saving beneficiary account:", JSON.stringify(error, null, 2));
        return null;
    }

    return data;
}

// -- MAPPER --

function mapDbToFundingSource(row: any): FundingSource {
    return {
        id: row.id,
        workspace_id: row.workspace_id,
        name: row.name,
        type: row.type as FundingSourceType,
        provider: row.provider as BankProvider,
        currency: row.currency,
        balance: row.balance,
        account_number: row.account_number,
        position: row.position,
        is_active: row.is_active,
        is_archived: row.is_archived,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

// -- PURCHASING --

export interface PurchasingRequestPayload {
    project_id: string;
    date: string;
    vendor?: string;
    description: string;
    type: string;
    subcategory?: string;
    amount: number;
    approval_status?: string;
    purchase_stage?: string;
    financial_status?: string;
    source_of_fund_id?: string;
    payment_date?: string;
    invoice_url?: string;
    notes?: string;
    beneficiary_bank?: string;
    beneficiary_number?: string;
    beneficiary_name?: string;
    created_by: string; // Required: user ID
    items: {
        name: string;
        qty: number;
        unit: string;
        unitPrice: number;
        total: number;
    }[];
}

export async function createPurchasingRequest(payload: PurchasingRequestPayload) {
    const { items, created_by, ...requestData } = payload;

    if (!created_by) {
        throw new Error("User ID is required to create a purchasing request");
    }

    console.log("[DEBUG] createPurchasingRequest - User:", created_by);
    console.log("[DEBUG] createPurchasingRequest - Payload:", JSON.stringify(requestData, null, 2));

    // 1. Create Request
    const result = await (supabase
        .from("purchasing_requests")
        .insert([{
            ...requestData,
            created_by
        }])
        .select()
        .single() as any);

    const { data: request, error: reqError } = result;

    if (reqError) {
        console.error("Error creating purchasing request:", JSON.stringify(reqError, null, 2));
        console.error("Error details - code:", reqError.code, "message:", reqError.message, "hint:", reqError.hint);
        throw reqError;
    }

    // 2. Create Items
    if (items.length > 0) {
        const itemsData = items.map(item => ({
            request_id: request.id,
            name: item.name,
            qty: item.qty,
            unit: item.unit,
            unit_price: item.unitPrice,
            total: item.total
        }));

        const result = await (supabase
            .from("purchasing_items")
            .insert(itemsData) as any);
        const { error: itemsError } = result;

        if (itemsError) {
            console.error("Error creating purchasing items:", itemsError);
            // Optional: rollback request creation?
            throw itemsError;
        }
    }

    return request;
}

export async function updatePurchasingRequest(id: string, payload: Partial<PurchasingRequestPayload>) {
    const { items, ...requestData } = payload;

    // 1. Update Request
    const result = await (supabase
        .from("purchasing_requests")
        .update({
            ...requestData,
            updated_at: new Date().toISOString()
        })
        .eq("id", id) as any);
    const { error: reqError } = result;

    if (reqError) {
        console.error("Error updating purchasing request:", reqError);
        console.error("Error details:", JSON.stringify(reqError, null, 2));
        throw reqError;
    }

    // 2. Update Items (Delete all and recreate for simplicity, same as reimburse)
    if (items) {
        const result = await (supabase
            .from("purchasing_items")
            .delete()
            .eq("request_id", id) as any);
        const { error: delError } = result;

        if (delError) {
            console.error("Delete items error:", delError);
            throw delError;
        }

        // Insert new
        if (items.length > 0) {
            const itemsData = items.map(item => ({
                request_id: id,
                name: item.name,
                qty: item.qty,
                unit: item.unit,
                unit_price: item.unitPrice,
                total: item.total
            }));

            const result = await (supabase
                .from("purchasing_items")
                .insert(itemsData) as any);
            const { error: insError } = result;

            if (insError) {
                console.error("Insert items error:", insError);
                console.error("Failed ID:", id);
                throw insError; // This is where FK error happens 
            }
        }
    }

    return true;
}

export async function fetchPurchasingRequests() {
    const response = await (supabase
        .from("purchasing_requests")
        .select(`
            *,
            project:projects(project_name, project_code),
            items:purchasing_items(*)
        `)
        .order("created_at", { ascending: false }) as any);

    if (response.error) {
        console.error("Error fetching purchasing requests:", JSON.stringify(response.error, null, 2));
        console.error("Error details - code:", response.error.code, "message:", response.error.message, "hint:", response.error.hint);
        return [];
    }

    return response.data;
}

export async function deletePurchasingRequest(requestId: string) {
    await (supabase
        .from("purchasing_items")
        .delete()
        .eq("request_id", requestId) as any);

    // Then delete the request
    const response = await (supabase
        .from("purchasing_requests")
        .delete()
        .eq("id", requestId) as any);

    if (response.error) {
        console.error("Error deleting purchasing request:", response.error);
        throw response.error;
    }

    return true;
}

// -- REIMBURSEMENT --

export interface ReimburseRequestPayload {
    project_id: string;
    category: string;
    subcategory?: string;
    date: string;
    description: string;
    amount: number;
    status?: string;
    invoice_url?: string;
    notes?: string;
    details?: any; // JSONB
    beneficiary_bank?: string;
    beneficiary_number?: string;
    beneficiary_name?: string;
    revision_reason?: string;
    rejection_reason?: string;
    approved_amount?: number;
    created_by: string; // Required: user ID
    items: {
        name: string;
        qty: number;
        unit: string;
        unitPrice: number;
        total: number;
    }[];
}

export async function createReimburseRequest(payload: ReimburseRequestPayload) {
    const { items, created_by, ...requestData } = payload;

    if (!created_by) {
        throw new Error("User ID is required to create a reimburse request");
    }

    // 1. Create Request
    const { data: request, error: reqError } = await supabase
        .from("reimbursement_requests")
        .insert([{
            ...requestData,
            user_id: created_by,
            created_by
        }])
        .select()
        .single();

    if (reqError) {
        console.error("Error creating reimburse request:", reqError);
        throw reqError;
    }

    // 2. Create Items
    if (items.length > 0) {
        const itemsData = items.map(item => ({
            reimbursement_id: request.id,
            name: item.name,
            qty: item.qty,
            unit: item.unit,
            unit_price: item.unitPrice,
            total: item.total
        }));

        const { error: itemsError } = await supabase
            .from("reimbursement_items")
            .insert(itemsData);

        if (itemsError) {
            console.error("Error creating reimburse items:", itemsError);
            throw itemsError;
        }
    }

    return request;
}

export async function fetchReimburseRequests() {
    const response = await (supabase
        .from("reimbursement_requests")
        .select(`
            *,
            project:projects(project_name, project_code),
            items:reimbursement_items(*)
        `)
        .order("created_at", { ascending: false }) as any);

    if (response.error) {
        console.error("Error fetching reimburse requests:", JSON.stringify(response.error, null, 2));
        console.error("Error details - code:", response.error.code, "message:", response.error.message, "hint:", response.error.hint);
        return [];
    }
    return response.data;
}

// -- PROFILES HELPER --
export async function fetchMyProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if we have a table mapping user ids to names if 'profiles' isn't sufficient
    // For now assuming existing profiles pattern
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return data;
}

// -- UPDATES / ACTIONS --

export async function updatePurchasingStatus(id: string, updates: {
    approval_status?: string;
    financial_status?: string;
    purchase_stage?: string;
    payment_date?: string;
    source_of_fund_id?: string;
    notes?: string;
    rejection_reason?: string;
    revision_reason?: string;
    payment_proof_url?: string;
    approved_amount?: number;
}) {
    const { error } = await supabase
        .from("purchasing_requests")
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq("id", id);

    if (error) {
        console.error("Error updating purchasing request:", error);
        return false;
    }
    return true;
}

export async function updateReimburseStatus(id: string, updates: {
    status?: string;
    payment_date?: string;
    invoice_url?: string;
    approved_amount?: number;
    notes?: string;
    revision_reason?: string;
    rejection_reason?: string;
    payment_proof_url?: string;
    source_of_fund_id?: string;
    details?: any; // Add details support
}) {
    console.log("updateReimburseStatus Payload:", { id, updates });

    // Handle approved_amount by moving it to details if column is missing


    const { error } = await supabase
        .from("reimbursement_requests")
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq("id", id);

    if (error) {
        console.error("Error updating reimburse status:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        return false;
    }
    return true;
}

export async function updateReimburseRequest(id: string, payload: Partial<ReimburseRequestPayload>) {
    const { items, ...requestData } = payload;

    // 1. Update Request
    const { error: reqError } = await supabase
        .from("reimbursement_requests")
        .update({
            ...requestData,
            updated_at: new Date().toISOString()
        })
        .eq("id", id);

    if (reqError) {
        console.error("Error updating reimburse request:", JSON.stringify(reqError, null, 2));
        throw reqError;
    }

    // 2. Update Items (Delete all and recreate for simplicity)
    if (items) {
        // Delete old
        const { error: delError } = await supabase
            .from("reimbursement_items")
            .delete()
            .eq("reimbursement_id", id);

        if (delError) throw delError;

        // Insert new
        if (items.length > 0) {
            const itemsData = items.map(item => ({
                reimbursement_id: id,
                name: item.name,
                qty: item.qty,
                unit: item.unit,
                unit_price: item.unitPrice,
                total: item.total
            }));

            const { error: insError } = await supabase
                .from("reimbursement_items")
                .insert(itemsData);

            if (insError) throw insError;
        }
    }

    return true;
}

export async function deleteReimburseRequest(requestId: string) {
    // First delete items (cascade should handle this, but being explicit)
    await supabase
        .from("reimbursement_items")
        .delete()
        .eq("reimbursement_id", requestId);

    // Then delete the request
    const { error } = await supabase
        .from("reimbursement_requests")
        .delete()
        .eq("id", requestId);

    if (error) {
        console.error("Error deleting reimburse request:", error);
        throw error;
    }

    return true;
}

export async function fetchFinanceDashboardData(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    // 1. TEAM SUMMARY
    // Total Paid (Purchasing + Reimburse) in Current Month
    const { data: paidPurchases } = await supabase
        .from('purchasing_requests')
        .select('amount')
        .eq('financial_status', 'PAID')
        .gte('payment_date', startOfMonth)
        .lte('payment_date', endOfMonth);

    const { data: paidReimburse } = await supabase
        .from('reimbursement_requests')
        .select('amount')
        .eq('status', 'PAID')
        .gte('payment_date', startOfMonth)
        .lte('payment_date', endOfMonth);

    const totalPaidPurchasing = paidPurchases?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const totalPaidReimburse = paidReimburse?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const totalPaidThisMonth = totalPaidPurchasing + totalPaidReimburse;

    // Outstanding Bills (Purchasing: Unpaid but Invoiced/Received)
    const { count: outstandingBills } = await supabase
        .from('purchasing_requests')
        .select('*', { count: 'exact', head: true })
        .neq('financial_status', 'PAID')
        .in('purchase_stage', ['INVOICED', 'RECEIVED']);

    // Reimburse Pending
    const { count: reimbursePending } = await supabase
        .from('reimbursement_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PENDING']); // Ensure PENDING status is correct

    // Petty Cash Balance
    const { data: pettyCash } = await supabase
        .from('funding_sources')
        .select('balance')
        .eq('type', 'PETTY_CASH');
    const pettyCashBalance = pettyCash?.reduce((sum, item) => sum + (item.balance || 0), 0) || 0;

    // 2. PERSONAL SUMMARY
    // My Purchases (This Month)
    const { count: myPurchases } = await supabase
        .from('purchasing_requests')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .gte('created_at', startOfMonth);

    // My Reimbursements (This Month)
    const { count: myReimburse } = await supabase
        .from('reimbursement_requests')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .gte('created_at', startOfMonth);

    // Pending Approval (My Submissions)
    // Updated Pending Logic
    const purchasesResult = await (supabase
        .from('purchasing_requests')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .in('approval_status', ['DRAFT', 'SUBMITTED', 'NEED_REVISION']) as any);

    const myPendingPurchases = purchasesResult.count;

    const reimburseResult = await (supabase
        .from('reimbursement_requests')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .in('status', ['DRAFT', 'PENDING', 'NEED_REVISION']) as any);

    const myPendingReimburse = reimburseResult.count;

    const pendingApproval = (myPendingPurchases || 0) + (myPendingReimburse || 0);

    console.log("[DEBUG] Dashboard Pending Count details:", {
        purchasingCount: myPendingPurchases,
        purchasingError: purchasesResult.error,
        reimburseCount: myPendingReimburse,
        reimburseError: reimburseResult.error,
        total: pendingApproval,
        userId
    });

    // Paid to Me (This Month)
    const { data: myPaidReimburse } = await supabase
        .from('reimbursement_requests')
        .select('amount')
        .eq('created_by', userId)
        .eq('status', 'PAID')
        .gte('payment_date', startOfMonth)
        .lte('payment_date', endOfMonth);
    const paidToMe = myPaidReimburse?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

    // 3. ATTENTION ITEMS (TEAM VIEW) / LISTS
    // Goods Received (Unpaid)
    const { data: goodsReceived } = await supabase
        .from('purchasing_requests')
        .select('*, project:projects(project_name, project_code)')
        .eq('purchase_stage', 'RECEIVED')
        .neq('financial_status', 'PAID')
        .order('date', { ascending: true })
        .limit(5);

    // Invoices Pending
    const { data: invoices } = await supabase
        .from('purchasing_requests')
        .select('*, project:projects(project_name, project_code)')
        .eq('purchase_stage', 'INVOICED')
        .neq('financial_status', 'PAID')
        .order('date', { ascending: true })
        .limit(5);

    // Reimburse Approval
    const { data: staffClaims } = await supabase
        .from('reimbursement_requests')
        .select('*, project:projects(project_name, project_code)')
        .eq('status', 'PENDING')
        .order('date', { ascending: true })
        .limit(10);

    // 4. MY HISTORY (PERSONAL VIEW)
    const { data: myPurchaseHistory } = await supabase
        .from('purchasing_requests')
        .select('*, project:projects(project_name, project_code)')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(5);

    const { data: myReimburseHistory } = await supabase
        .from('reimbursement_requests')
        .select('*, project:projects(project_name, project_code)')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(5);

    // 5. RECENT ACTIVITY (TEAM VIEW)
    const { data: recentPurchases } = await supabase
        .from('purchasing_requests')
        .select('*, project:projects(project_name, project_code)')
        .order('updated_at', { ascending: false })
        .limit(10);

    const { data: recentReimburse } = await supabase
        .from('reimbursement_requests')
        .select('*, project:projects(project_name, project_code)')
        .order('updated_at', { ascending: false })
        .limit(10);

    // Fetch profiles manually to avoid join errors
    const userIds = new Set<string>();
    recentPurchases?.forEach(p => { if (p.created_by) userIds.add(p.created_by); });
    recentReimburse?.forEach(r => { if (r.created_by) userIds.add(r.created_by); });

    // If we have userIds, fetch profiles
    let profileMap = new Map<string, string>();
    if (userIds.size > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, full_name')
            .in('id', Array.from(userIds));
        if (profiles) {
            profiles.forEach(p => {
                // Use full_name if available, otherwise username
                profileMap.set(p.id, p.full_name || p.username || 'Unknown User');
            });
        }
    }

    // Merge and sort
    const allActivity = [
        ...(recentPurchases || []).map(p => ({
            ...p,
            type: 'PURCHASE',
            created_by_name: profileMap.get(p.created_by) || p.created_by_name || 'Unknown User'
        })),
        ...(recentReimburse || []).map(r => ({
            ...r,
            type: 'REIMBURSE',
            staff_name: profileMap.get(r.created_by) || r.staff_name || 'Unknown Staff'
        }))
    ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 10);

    return {
        summary: {
            team: {
                totalPaidThisMonth,
                outstanding: outstandingBills || 0,
                reimbursePending: reimbursePending || 0,
                pettyCashBalance
            },
            personal: {
                myPurchases: myPurchases || 0,
                myReimburse: myReimburse || 0,
                pendingApproval,
                paid: paidToMe
            }
        },
        lists: {
            goodsReceived: goodsReceived || [],
            invoices: invoices || [],
            staffClaims: staffClaims || [],
            myPurchaseHistory: myPurchaseHistory || [],
            myReimburseHistory: myReimburseHistory || [],
            recentActivity: allActivity
        }
    };
}
