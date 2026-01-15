
import { format } from "date-fns";

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

// Format date nicely (Day Month only)
export function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// Convert STATUS_NAME to Status Name (Title Case)
export function formatStatus(status: string) {
    return status.split(/_|\s/)
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
