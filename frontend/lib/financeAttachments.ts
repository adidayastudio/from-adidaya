export interface FinanceAttachment { path: string; name: string; [key: string]: any }
export function normalizeFinanceAttachments(value: unknown, label = 'Receipt'): FinanceAttachment[] {
    const rows: FinanceAttachment[] = [];
    const visit = (item: any) => {
        if (!item) return;
        if (Array.isArray(item)) { item.forEach(visit); return; }
        if (typeof item === 'string') {
            const text = item.trim(); if (!text) return;
            if (text.startsWith('[') || text.startsWith('{')) { try { visit(JSON.parse(text)); return; } catch {} }
            // Keep data URLs intact: their comma is part of the encoding.
            const paths = text.startsWith('data:') ? [text] : text.split(',');
            paths.map(path => path.trim()).filter(Boolean).forEach(path => rows.push({ path, name: `${label} ${rows.length + 1}` }));
            return;
        }
        if (typeof item === 'object') {
            const path = item.invoice_url || item.url || item.path || item.file_url || item.payment_proof_url;
            const start = rows.length; visit(path);
            for (let i = start; i < rows.length; i++) rows[i] = { ...item, ...rows[i], name: item.invoice_name || item.name || item.file_name || rows[i].name };
        }
    };
    visit(value);
    const unique = new Map<string, FinanceAttachment>();
    for (const row of rows) { if (!unique.has(row.path)) unique.set(row.path, row); }
    return [...unique.values()];
}
export function financeReceipts(request: any): FinanceAttachment[] {
    return normalizeFinanceAttachments([request?.invoices, request?.existingInvoices, request?.reimbursement_invoices, request?.invoice_url, request?.receipt_url, request?.attachment_url, request?.file_url]);
}
export function financeProofs(request: any): FinanceAttachment[] {
    return normalizeFinanceAttachments([request?.payment_proof_url, request?.proof_url, request?.payment_proofs, request?.expense_proof_url], 'Payment Proof');
}
