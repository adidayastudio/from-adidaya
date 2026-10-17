import { format, parse } from 'date-fns';

export interface Notification {
    id: string;
    text: string;
    module: string;
    user: string;
    time: string; // Format: "dd/MM/yyyy, HH:mm:ss"
    unread: boolean;
    category: 'finance' | 'crew' | 'projects' | 'system';
    requestId?: string;
    requestType?: 'purchasing' | 'reimbursement';
    projectCode?: string;
    action?: string;
    ref?: string;
    subjectUser?: string;
}

export function parseNotificationDate(timeStr: string): Date {
    if (!timeStr) return new Date();
    // Try standard ISO or new Date parse first
    if (timeStr.includes('T') || (timeStr.includes('-') && !timeStr.includes('/'))) {
        const d = new Date(timeStr);
        if (!isNaN(d.getTime())) return d;
    }
    try {
        const parsed = parse(timeStr, 'dd/MM/yyyy, HH:mm:ss', new Date());
        if (!isNaN(parsed.getTime())) return parsed;
    } catch {}
    const fallback = new Date(timeStr);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
}

export const MOCK_NOTIFICATIONS: Notification[] = [];
