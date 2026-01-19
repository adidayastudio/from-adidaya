import { format } from "date-fns";
import { ApprovalStatus, PurchaseStage, FinancialStatus } from "@/lib/types/finance-types";

export type PrimaryStatus = ApprovalStatus | FinancialStatus | "PENDING" | "UNPAID";

export function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace(/\u00a0/g, " ");
}

export function formatShort(amount: number) {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(0)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return formatCurrency(amount);
}

// Format full amount without comma, just dots for thousands
export function formatAmount(amount: number) {
    return `Rp ${amount.toLocaleString('id-ID').replace(/,/g, '.')}`;
}

// Format date nicely (Day Month Year)
export function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return format(date, "dd MMM yyyy");
}

// Convert STATUS_NAME to Status Name (Title Case)
export function formatStatus(status: string) {
    return status.replace(/_/g, ' ').split(/\s/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Check if deadline is overdue or today
export function getDeadlineStatus(deadline?: string) {
    if (!deadline) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);

    if (deadlineDate < today) return 'overdue';
    if (deadlineDate.getTime() === today.getTime()) return 'today';
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return 'soon';
    return 'normal';
}

export function getPrimaryStatus(
    approvalStatus: ApprovalStatus,
    purchaseStage: PurchaseStage,
    financialStatus: FinancialStatus
): string {
    if (financialStatus === 'PAID') return 'PAID';
    if (financialStatus === 'UNPAID') return 'UNPAID';
    if (approvalStatus === 'APPROVED') return 'APPROVED';
    if (approvalStatus === 'REJECTED') return 'REJECTED';
    if (approvalStatus === 'SUBMITTED') return 'SUBMITTED';
    return approvalStatus;
}

export const STATUS_THEMES: Record<string, { bg: string; text: string; border?: string }> = {
    DRAFT: { bg: "bg-neutral-100", text: "text-neutral-600" },
    SUBMITTED: { bg: "bg-orange-50", text: "text-orange-700" },
    APPROVED: { bg: "bg-blue-50", text: "text-blue-700" },
    PAID: { bg: "bg-green-50", text: "text-green-700" },
    UNPAID: { bg: "bg-red-50", text: "text-red-700" },
    PENDING: { bg: "bg-orange-50", text: "text-orange-700" },
    REJECTED: { bg: "bg-rose-50", text: "text-rose-700" },
};

export function cleanEntityName(name: string): string {
    if (!name) return name;
    // Regex to find common Indonesian entity prefixes with optional dots and spaces
    const cleanedName = name.replace(
        /\b(PT|CV|TB|UD)\s*\.?\s*/gi,
        (match, p1) => p1.toUpperCase() + " "
    ).trim();

    return cleanedName.replace(/\s+/g, ' ');
}
