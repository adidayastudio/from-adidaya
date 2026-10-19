import { normalizeFinanceAttachments } from './financeAttachments';

export interface FinancePaymentRecord {
    id: string;
    amount: number;
    date: string;
    proofs: { path: string; name: string }[];
    source_of_fund_id?: string;
}

export function financePaymentRecords(request: any): FinancePaymentRecord[] {
    if (Array.isArray(request?.payment_records)) return request.payment_records.map((record: any) => ({
        ...record, amount: Number(record.amount), proofs: normalizeFinanceAttachments(record.proofs, 'Payment Proof'),
    }));
    const history = request?._payment_history?.filter((entry: any) => entry.action === 'payment_processed');
    if (history?.length) return history.map((entry: any) => ({ id: entry.id, amount: Number(entry.details?.amount || 0), date: String(entry.details?.payment_date || entry.created_at || '').slice(0, 10), proofs: normalizeFinanceAttachments(entry.details?.payment_proof_url, 'Payment Proof'), source_of_fund_id: entry.details?.source_of_fund_id }));
    const proofs = normalizeFinanceAttachments(request?.payment_proof_url, 'Payment Proof');
    const paid = Number(request?.paid_amount ?? request?._paid_amount ??
        (String(request?.financial_status || request?.status).toUpperCase() === 'PAID' ? request?.approved_amount ?? request?.amount : 0));
    if (!paid && !proofs.length) return [];
    // Older requests only have an aggregate. Keep their proofs together rather than inventing installment amounts.
    return [{ id: `legacy-${request.id}`, amount: paid, date: String(request.payment_date || '').slice(0, 10), proofs, source_of_fund_id: request.source_of_fund_id }];
}

export function validateFinancePayments(records: FinancePaymentRecord[], total: number) {
    let paid = 0;
    for (const [index, record] of records.entries()) {
        const label = `Payment ${index + 1}`;
        if (!Number.isFinite(record.amount) || record.amount <= 0) throw new Error(`${label}: enter an amount greater than zero.`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date) || Number.isNaN(Date.parse(record.date)) || new Date(record.date).toISOString().slice(0, 10) !== record.date) throw new Error(`${label}: enter a valid date (YYYY-MM-DD).`);
        if (!record.proofs.length || record.proofs.some(proof => !proof.path)) throw new Error(`${label}: add a payment proof.`);
        paid += Math.round(record.amount * 100);
    }
    const paidAmount = paid / 100;
    if (!Number.isFinite(total) || (paid && paid > Math.round(total * 100))) throw new Error('Total payments cannot exceed the transaction amount.');
    return { paid: paidAmount, remaining: Math.max(0, total - paidAmount), status: paid === 0 ? 'UNPAID' : paid >= Math.round(total * 100) ? 'PAID' : 'PARTIALLY_PAID' };
}
