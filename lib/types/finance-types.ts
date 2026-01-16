// Finance Domain Types
// Supports construction purchasing workflows: kasbon, post-spend, pre-approval

export type FinancialStatus = "NOT_PAYABLE" | "UNPAID" | "PAID";
export type ApprovalStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "PAID" | "REJECTED" | "CANCELLED";
export type PurchaseStage = "PLANNED" | "INVOICED" | "RECEIVED";

export type FundingSourceType = "BANK" | "CASH" | "PETTY_CASH" | "REIMBURSE";

export type PurchaseType = "MATERIAL" | "TOOL" | "SERVICE";

export type ReimburseStatus = "DRAFT" | "PENDING" | "APPROVED" | "PAID" | "REJECTED" | "CANCELLED";

export interface FundingSource {
    id: string;
    name: string;
    type: FundingSourceType;
    currency: string;
    balance?: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface PurchasingItem {
    id: string;
    date: string;
    project_id: string;
    project_code: string; // PRG, JPF
    project_name: string;
    vendor: string;
    description: string;
    quantity?: string;
    unit?: string;
    type: PurchaseType;
    subcategory?: string;
    amount: number;
    approval_status: ApprovalStatus;
    purchase_stage: PurchaseStage;
    financial_status: FinancialStatus;
    source_of_fund_id?: string;
    source_of_fund_name?: string;
    payment_date?: string;
    payment_proof_url?: string;
    notes?: string;
    rejection_reason?: string;
    created_by: string;
    created_by_name?: string;
    submitted_by_name?: string;
    created_at: string;
    updated_at: string;
}

export interface ReimburseRequest {
    id: string;
    staff_id: string;
    staff_name: string;
    project_id: string;
    project_name: string;
    description: string;
    quantity?: string;
    amount: number;
    status: ReimburseStatus;
    invoice_url?: string;
    payment_date?: string;
    source_of_fund_id?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface PettyCashPool {
    id: string;
    project_id: string;
    project_name: string;
    balance: number;
    last_updated: string;
}

export interface PettyCashTransaction {
    id: string;
    pool_id: string;
    type: "TOP_UP" | "WITHDRAWAL" | "ADJUSTMENT";
    amount: number;
    description: string;
    performed_by: string;
    performed_by_name?: string;
    created_at: string;
}

// Summary types for Overview page
export interface FinanceOverviewSummary {
    totalPaidThisMonth: number;
    outstanding: number;
    reimbursePending: number;
    pettyCashBalance: number;
}

export interface NeedAttentionItem {
    id: string;
    type: "purchase" | "reimburse";
    title: string;
    subtitle: string;
    amount: number;
    date: string;
    status: string;
}

export interface RecentActivity {
    id: string;
    action: string;
    description: string;
    user: string;
    timestamp: string;
}

export interface AttentionItem {
    id: string;
    type: "goods_received" | "invoice" | "staff_claim";
    description: string;
    quantity?: string;
    projectCode: string;
    projectName: string;
    submittedDate: string;
    deadline?: string;
    beneficiary: string;
    beneficiaryType: "vendor" | "staff";
    amount: number;
}
