import { financeReceipts } from './financeAttachments';
import type { DocumentLevelConfig } from './api/financeSetup';

export type AttachmentKind = 'INVOICE' | 'RECEIPT' | 'IMAGE' | 'DOCUMENT' | 'LINK';
export function attachmentKind(file: any): AttachmentKind {
    try {
        const kind = JSON.parse(file.notes || '{}').attachmentKind;
        if (['INVOICE', 'RECEIPT', 'IMAGE', 'DOCUMENT', 'LINK'].includes(kind)) return kind;
    } catch {}
    if (['RECEIPT', 'IMAGE', 'DOCUMENT', 'LINK'].includes(file.invoice_type)) return file.invoice_type;
    if (/^\[Link:/i.test(file.invoice_name || '')) return 'LINK';
    // Recover photo references created before attachment metadata was stored.
    if (/^(IMG_|photo-)/i.test(file.invoice_name || '')) return 'IMAGE';
    return 'INVOICE';
}

export function splitReferenceNotes(notes = '') {
    const marker = '\n\nReference Links:\n';
    const index = notes.indexOf(marker);
    const startsWithLinks = notes.startsWith('Reference Links:\n');
    if (index < 0 && !startsWithLinks) return { notes, links: [] as string[] };
    const text = startsWithLinks ? notes.slice('Reference Links:\n'.length) : notes.slice(index + marker.length);
    const lines = text.split('\n').filter(Boolean);
    const links = lines.map(line => line.match(/^- .*?: (https?:\/\/\S+)$/)?.[1]);
    // Only remove the exact legacy block written by the request form.
    if (links.some(link => !link)) return { notes, links: [] as string[] };
    return { notes: startsWithLinks ? '' : notes.slice(0, index), links: links as string[] };
}

export function requestAttachments(request: any): any[] {
    const files: any[] = financeReceipts(request).map(file => ({ ...file, invoice_url: file.path, invoice_name: file.name }));
    for (const url of splitReferenceNotes(request?.notes || '').links) {
        if (!files.some(file => file.invoice_url === url)) files.push({ invoice_url: url, invoice_name: url, invoice_type: 'LINK' });
    }
    return files;
}

export function formatPurchasingReference(request: any, rule: DocumentLevelConfig, contextCode?: string, orgPrefix: string = 'ADY'): string {
    const code = (rule?.customCode || rule?.recommendedCode || 'PR').trim().toUpperCase();
    const length = Math.max(1, Math.min(10, rule?.sequenceLength || 5));
    const sequence = request.request_number;
    if (sequence == null) return code;
    // Sequence allocation remains authoritative in the database.
    if (!/^\d+$/.test(String(sequence))) return String(sequence);
    const sequenceText = String(sequence).padStart(length, '0');
    const date = new Date(request.date || request.created_at || Date.now());
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const month = romanMonths[date.getMonth()] || 'I';
    const year = date.getFullYear();
    const scope = rule?.sequenceScope || 'global';
    const cleanOrg = (orgPrefix || 'ADY').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'ADY';

    if (scope === 'reference') {
        const parentReference = String(request.parent_request_number || request.parent_reference || '00001');
        return `${cleanOrg}/FIN/${parentReference}/${code}-${sequenceText}/${month}/${year}`;
    }
    if (['contextual', 'project', 'department'].includes(scope)) {
        return `${cleanOrg}/FIN/${contextCode || 'PRJ'}/${code}-${sequenceText}/${month}/${year}`;
    }
    return `${cleanOrg}/FIN/${code}-${sequenceText}/${month}/${year}`;
}

export function formatPurchasingShortReference(request: any, rule: DocumentLevelConfig, contextCode?: string): string {
    const code = (rule?.customCode || rule?.recommendedCode || 'PR').trim().toUpperCase();
    const length = Math.max(1, Math.min(10, rule?.sequenceLength || 5));
    const sequence = request.request_number;
    if (sequence == null) return code;
    if (!/^\d+$/.test(String(sequence))) return String(sequence);
    const number = `${code}-${String(sequence).padStart(length, '0')}`;

    if (rule?.sequenceScope === 'reference') {
        const parentReference = String(request.parent_request_number || request.parent_reference || '00001');
        return `${parentReference.replace(/^0+/, '') || '1'}/${number}`;
    }
    if (rule?.sequenceScope === 'contextual' || rule?.sequenceScope === 'project' || rule?.sequenceScope === 'department') {
        if (contextCode) return `${contextCode}/${number}`;
    }
    return number;
}

// Match the existing finance trip-metadata storage pattern; user-visible notes stay plain.
const COMMERCIAL_MARKER = '<!--FINANCE_PURCHASE:';
export const commercialFields = ['department_id', 'department_name', 'department_code', 'discount_type', 'discount_value', 'discount_amount', 'subtotal_amount', 'tax_rule_id', 'tax_name', 'tax_rate', 'tax_amount', 'tax_type', 'payment_term_id', 'payment_term_name', 'payment_term_days', 'invoice_number', 'invoice_date', 'payment_records'] as const;
export function readPurchasingNotes(raw = '') {
    const start = raw.lastIndexOf(COMMERCIAL_MARKER);
    if (start < 0 || !raw.endsWith('-->')) return { notes: raw, commercial: {} as Record<string, any> };
    try {
        const parsed = JSON.parse(raw.slice(start + COMMERCIAL_MARKER.length, -3));
        const commercial: Record<string, any> = {};
        for (const field of commercialFields) if (parsed[field] !== undefined) commercial[field] = parsed[field];
        return { notes: raw.slice(0, start).trimEnd(), commercial };
    } catch { return { notes: raw, commercial: {} as Record<string, any> }; }
}
export function writePurchasingNotes(notes: string | undefined, payload: Record<string, any>) {
    const existing = readPurchasingNotes(notes || '');
    const commercial = { ...existing.commercial };
    for (const field of commercialFields) if (payload[field] !== undefined) commercial[field] = payload[field];
    if (!Object.keys(commercial).length) return notes;
    return `${existing.notes}\n\n${COMMERCIAL_MARKER}${JSON.stringify(commercial)}-->`.trim();
}
