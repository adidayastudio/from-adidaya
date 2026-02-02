/**
 * Finance Client API
 * 
 * Client-side functions that call the server-side API routes.
 * Replaces direct Supabase calls in client components.
 */

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/lib/client/api";
import { FundingSource } from "@/lib/types/finance-types";

// Local type definition for BeneficiaryAccount (matches server-side)
export interface BeneficiaryAccount {
    id: string;
    bank_name: string;
    account_number: string;
    account_name: string;
    alias?: string;
    is_global: boolean;
    created_by: string;
}

// =============================================
// PURCHASING
// =============================================

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
    items: {
        name: string;
        qty: number;
        unit: string;
        unitPrice: number;
        total: number;
    }[];
}

export async function fetchPurchasingRequests(options?: {
    limit?: number;
    offset?: number;
    project_id?: string;
    approval_status?: string;
    my_requests?: boolean;
    q?: string;
    month?: number | "ALL";
    year?: number;
}) {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    if (options?.project_id) params.set("project_id", options.project_id);
    if (options?.approval_status) params.set("approval_status", options.approval_status);
    if (options?.my_requests) params.set("my_requests", "true");
    if (options?.q) params.set("q", options.q);
    if (options?.month) params.set("month", String(options.month));
    if (options?.year) params.set("year", String(options.year));

    const url = `/api/finance/purchasing${params.toString() ? `?${params}` : ""}`;
    const { data, error } = await apiGet<{ data: any[], count: number, stats?: any }>(url);

    if (error) {
        console.error("Error fetching purchasing requests:", error);
        return { data: [], total: 0, stats: null };
    }

    return {
        data: data?.data || [],
        total: data?.count || 0,
        stats: data?.stats || null
    };
}

export async function createPurchasingRequest(payload: PurchasingRequestPayload) {
    const { data, error } = await apiPost<any>("/api/finance/purchasing", payload);

    if (error) {
        console.error("Error creating purchasing request:", error);
        throw new Error(error);
    }

    return data;
}

export async function updatePurchasingRequest(id: string, payload: Partial<PurchasingRequestPayload>) {
    const { data, error } = await apiPut<any>(`/api/finance/purchasing/${id}`, payload);

    if (error) {
        console.error("Error updating purchasing request:", error);
        throw new Error(error);
    }

    return data;
}

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
    const { data, error } = await apiPatch<any>(`/api/finance/purchasing/${id}`, updates);

    if (error) {
        console.error("Error updating purchasing status:", error);
        return false;
    }

    return true;
}

export async function deletePurchasingRequest(id: string) {
    const { data, error } = await apiDelete<any>(`/api/finance/purchasing/${id}`);

    if (error) {
        console.error("Error deleting purchasing request:", error);
        throw new Error(error);
    }

    return true;
}

// =============================================
// REIMBURSEMENT
// =============================================

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
    details?: any;
    beneficiary_bank?: string;
    beneficiary_number?: string;
    beneficiary_name?: string;
    revision_reason?: string;
    rejection_reason?: string;
    approved_amount?: number;
    items: {
        name: string;
        qty: number;
        unit: string;
        unitPrice: number;
        total: number;
    }[];
}

export async function fetchReimburseRequests(options?: {
    limit?: number;
    offset?: number;
    project_id?: string;
    status?: string;
    my_requests?: boolean;
    q?: string;
    month?: number | "ALL";
    year?: number;
}) {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    if (options?.project_id) params.set("project_id", options.project_id);
    if (options?.status) params.set("status", options.status);
    if (options?.my_requests) params.set("my_requests", "true");
    if (options?.q) params.set("q", options.q);
    if (options?.month) params.set("month", String(options.month));
    if (options?.year) params.set("year", String(options.year));

    const url = `/api/finance/reimbursement${params.toString() ? `?${params}` : ""}`;
    const { data, error } = await apiGet<{ data: any[], count: number, stats?: any }>(url);

    if (error) {
        console.error("Error fetching reimbursement requests:", error);
        return { data: [], total: 0, stats: null };
    }

    return {
        data: data?.data || [],
        total: data?.count || 0,
        stats: data?.stats || null
    };
}

export async function createReimburseRequest(payload: ReimburseRequestPayload) {
    const { data, error } = await apiPost<any>("/api/finance/reimbursement", payload);

    if (error) {
        console.error("Error creating reimbursement request:", error);
        throw new Error(error);
    }

    return data;
}

export async function updateReimburseRequest(id: string, payload: Partial<ReimburseRequestPayload>) {
    const { data, error } = await apiPut<any>(`/api/finance/reimbursement/${id}`, payload);

    if (error) {
        console.error("Error updating reimbursement request:", error);
        throw new Error(error);
    }

    return data;
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
    details?: any;
}) {
    const { data, error } = await apiPatch<any>(`/api/finance/reimbursement/${id}`, updates);

    if (error) {
        console.error("Error updating reimbursement status:", error);
        return false;
    }

    return true;
}

export async function deleteReimburseRequest(id: string) {
    const { data, error } = await apiDelete<any>(`/api/finance/reimbursement/${id}`);

    if (error) {
        console.error("Error deleting reimbursement request:", error);
        throw new Error(error);
    }

    return true;
}

// =============================================
// FUNDING SOURCES
// =============================================

export async function fetchFundingSources(workspaceId: string): Promise<FundingSource[]> {
    const { data, error } = await apiGet<FundingSource[]>(
        `/api/finance/funding-sources?workspace_id=${workspaceId}`
    );

    if (error) {
        console.error("Error fetching funding sources:", error);
        return [];
    }

    return data || [];
}

export async function upsertFundingSource(source: Partial<FundingSource> & { workspace_id: string }) {
    const { data, error } = await apiPost<FundingSource>("/api/finance/funding-sources", source);

    if (error) {
        console.error("Error saving funding source:", error);
        throw new Error(error);
    }

    return data;
}

export async function updateFundingSourcePositions(items: { id: string; position: number }[]) {
    const { data, error } = await apiPatch<any>("/api/finance/funding-sources", { items });

    if (error) {
        console.error("Error updating positions:", error);
        return false;
    }

    return true;
}

export async function deleteFundingSource(id: string) {
    const { data, error } = await apiDelete<any>(`/api/finance/funding-sources/${id}`);

    if (error) {
        console.error("Error deleting funding source:", error);
        return false;
    }

    return true;
}

export async function toggleFundingSourceArchive(id: string, isArchived: boolean) {
    const { data, error } = await apiPatch<any>(`/api/finance/funding-sources/${id}`, { is_archived: isArchived });

    if (error) {
        console.error("Error archiving funding source:", error);
        return false;
    }

    return true;
}

export async function toggleFundingSourceActive(id: string, isActive: boolean) {
    const { data, error } = await apiPatch<any>(`/api/finance/funding-sources/${id}`, { is_active: isActive });

    if (error) {
        console.error("Error toggling funding source status:", error);
        return false;
    }

    return true;
}

// =============================================
// BENEFICIARY ACCOUNTS
// =============================================

export async function fetchBeneficiaryAccounts(): Promise<BeneficiaryAccount[]> {
    const { data, error } = await apiGet<BeneficiaryAccount[]>("/api/finance/beneficiary-accounts");

    if (error) {
        console.error("Error fetching beneficiary accounts:", error);
        return [];
    }

    return data || [];
}

export async function saveBeneficiaryAccount(account: {
    bank_name: string;
    account_number: string;
    account_name: string;
    alias?: string;
    is_global?: boolean;
}) {
    const { data, error } = await apiPost<BeneficiaryAccount>("/api/finance/beneficiary-accounts", account);

    if (error) {
        console.error("Error saving beneficiary account:", error);
        return null;
    }

    return data;
}

// =============================================
// DASHBOARD
// =============================================

export interface FinanceDashboardData {
    summary: {
        team: {
            totalPaid: number;
            trend: number;
            outstanding: { count: number; amount: number };
            reimbursePending: { count: number; amount: number };
            balance: { total: number; accounts: number };
        };
        personal: {
            purchases: { count: number; amount: number };
            reimburse: { count: number; amount: number };
            pendingPurchases: { count: number; amount: number };
            pendingReimburse: { count: number; amount: number };
        };
    };
    lists: {
        goodsReceived: any[];
        invoices: any[];
        staffClaims: any[];
        myPurchaseHistory: any[];
        myReimburseHistory: any[];
    };
}

export async function fetchFinanceDashboardData(workspaceId?: string): Promise<FinanceDashboardData | null> {
    const params = new URLSearchParams();
    if (workspaceId) params.set("workspace_id", workspaceId);

    const url = `/api/finance/dashboard${params.toString() ? `?${params}` : ""}`;
    const { data, error } = await apiGet<FinanceDashboardData>(url);

    if (error) {
        console.error("Error fetching dashboard data:", error);
        return null;
    }

    return data;
}

// =============================================
// PROFILE
// =============================================

export async function fetchMyProfile() {
    const { data, error } = await apiGet<any>("/api/profile");

    if (error) {
        console.error("Error fetching profile:", error);
        return null;
    }

    return data;
}
