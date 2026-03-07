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
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return format(date, "dd MMM yyyy");
}

// Format card dates (hide current year)
export function formatCardDate(dateStr: string) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const currentYear = new Date().getFullYear();

    if (date.getFullYear() === currentYear) {
        return format(date, "d MMM");
    }
    return format(date, "d MMM yyyy");
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
    if (approvalStatus === 'DRAFT') return 'DRAFT';
    if (approvalStatus === 'REJECTED') return 'REJECTED';
    if (approvalStatus === 'NEED_REVISION') return 'NEED_REVISION';
    if (financialStatus === 'PAID') return 'PAID';
    if (approvalStatus === 'APPROVED') return 'UNPAID';
    if (approvalStatus === 'SUBMITTED') return 'SUBMITTED';
    return approvalStatus;
}

export const STATUS_THEMES: Record<string, { bg: string; text: string; border?: string }> = {
    DRAFT: { bg: "bg-neutral-100 dark:bg-neutral-800", text: "text-neutral-600 dark:text-neutral-400", border: "border-neutral-200 dark:border-neutral-700" },
    SUBMITTED: { bg: "bg-orange-500/10 dark:bg-orange-500/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
    APPROVED: { bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
    PAID: { bg: "bg-emerald-500/10 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
    UNPAID: { bg: "bg-rose-500/10 dark:bg-rose-500/20", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/20" },
    PENDING: { bg: "bg-orange-500/10 dark:bg-orange-500/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
    REJECTED: { bg: "bg-rose-500/10 dark:bg-rose-500/20", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/20" },
    NEED_REVISION: { bg: "bg-orange-500/10 dark:bg-orange-500/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
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
export function formatStructuredId(type: 'PO' | 'RE', projectNumber?: string, requestNumber?: number, projectCode?: string) {
    if (!projectNumber && !projectCode) return '';
    const seq = requestNumber ? String(requestNumber).padStart(5, '0') : "00000";

    // Use projectNumber if available, otherwise projectCode
    const projId = projectNumber || projectCode || '???';

    // Ensure numeric project identifiers are padded to at least 3 digits
    const proj = isNaN(Number(projId)) ? projId : String(projId).padStart(3, '0');

    return `${type}-${proj}-${seq}`;
}

export function formatItemTitle(items: { name: string }[], fallback?: string): string {
    if (!items || items.length === 0) return fallback || "No description";
    if (items.length === 1) return items[0].name;
    if (items.length === 2) return `${items[0].name} and ${items[1].name}`;
    return `${items[0].name}, ${items[1].name}, + ${items.length - 2} more`;
}
