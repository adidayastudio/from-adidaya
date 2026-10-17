import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import {
    getFinanceDocumentRules,
    getFinanceApprovalMatrixSettings,
    evaluateApprovalChain,
    generateDocumentCode,
    FinanceApproverLevel,
    FinanceApprovalMatrixSettings,
    DEFAULT_FINANCE_APPROVAL_MATRIX_SETTINGS,
} from './financeSetup';
import { formatPurchasingShortReference, readPurchasingNotes, writePurchasingNotes } from '../financeRequestPresentation';
import { fetchPurchasingRequests, updatePurchasingStatus, PurchasingRequest } from './finance';

export type PurchasingConsolidationStatus = 
    | 'Draft'
    | 'Pending'
    | 'Approved'
    | 'Paying'
    | 'Partially Paid'
    | 'Paid'
    | 'Revision'
    | 'Rejected'
    | 'Cancelled';

export interface FinanceAuditLogItem {
    id: string;
    entity_type: 'purchasing_request' | 'purchasing_consolidation' | 'purchasing_payment';
    entity_id: string;
    action: string;
    actor_id?: string;
    actor_name: string;
    details?: any;
    created_at: string;
}

export interface PurchasingConsolidationItem {
    id: string;
    document_number: string;
    status: PurchasingConsolidationStatus;
    statusTag: string;
    created_at: string;
    updated_at: string;
    submitted_at?: string | null;
    approved_at?: string | null;
    approved_by?: string | null;
    created_by?: string;
    created_by_name?: string;
    notes?: string;
    rejection_reason?: string;
    revision_reason?: string;
    requests: any[];
    request_ids: string[];
    total_amount: number;
    approved_amount?: number;
    approval_note?: string;
    items_count: number;
    paid_requests_count: number;
    total_paid_amount: number;
    approval_chain?: FinanceApproverLevel[];
    payment_approval_chain?: FinanceApproverLevel[];
    audit_trail?: FinanceAuditLogItem[];
}

export interface ConsolidationRequestOverride {
    items?: Array<{ qty: number; unit: string; unit_price: number; total: number }>;
    amount?: number;
    tax_name?: string;
    tax_rule_id?: string | null;
    tax_rate?: number;
    tax_amount?: number;
    tax_type?: string;
    vendor?: string;
    source_of_fund_id?: string;
    beneficiary_bank?: string;
    beneficiary_number?: string;
    beneficiary_name?: string;
    payment_date?: string;
    notes?: string;
    discount_type?: string;
    discount_value?: number;
    discount_amount?: number;
    subtotal_amount?: number;
    payment_term_name?: string;
    payment_term_id?: string | null;
    payment_term_days?: number;
    consolidation_invoice_url?: string;
    consolidation_invoice_name?: string;
    consolidation_invoice_number?: string;
    consolidation_invoice_date?: string | null;
    target_date?: string;
    consolidation_notes?: string;
}

export function getConsolidationRequestIssues(request: any): string[] {
    const issues: string[] = [];
    const items = request.items?.length ? request.items : (request.description ? [{
        name: request.description,
        qty: Number(request.quantity) || 1,
        unit: request.unit || 'pcs',
        unit_price: Number(request.subtotal_amount ?? request.amount) || 0,
    }] : []);

    if (!request.shortRef && !request.ref && !request.cardRef) issues.push('Missing request document code');
    if (!items.length) issues.push('Missing item details');
    items.forEach((item: any, index: number) => {
        const itemName = item.name || item.item_name || `item ${index + 1}`;
        if (!item.name && !item.item_name) issues.push(`Missing item identity for item ${index + 1}`);
        if (!(Number(item.qty) > 0) || !item.unit) issues.push(`Missing quantity or unit for ${itemName}`);
        if (!(Number(item.unit_price ?? item.unitPrice ?? item.price) > 0)) issues.push(`Missing unit price for ${itemName}`);
    });

    return issues;
}

export interface PaymentBatchPayload {
    source_of_fund_id: string;
    payment_date: string;
    payment_proof_url?: string;
    amount: number;
    notes?: string;
    ref?: string;
    request_amounts?: Record<string, number>;
}

const STORAGE_CONSOLIDATIONS_KEY = 'forma_finance_consolidations_v1';
const STORAGE_AUDIT_LOGS_KEY = 'forma_finance_audit_logs_v1';
const STORAGE_CONSOLIDATION_OVERRIDES_KEY = 'forma_finance_consolidation_request_overrides_v1';

/**
 * Audit Logging Helper
 */
export async function logFinanceAudit(
    entityType: 'purchasing_request' | 'purchasing_consolidation' | 'purchasing_payment',
    entityId: string,
    action: string,
    actorId?: string,
    actorName: string = 'System User',
    details: any = {}
): Promise<void> {
    const record: FinanceAuditLogItem = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        entity_type: entityType,
        entity_id: entityId,
        action,
        actor_id: actorId,
        actor_name: actorName,
        details,
        created_at: new Date().toISOString(),
    };

    try {
        await supabase.from('finance_audit_logs').insert([record]);
    } catch {
        // Fallback local storage
    }

    try {
        const raw = await AsyncStorage.getItem(STORAGE_AUDIT_LOGS_KEY);
        const list: FinanceAuditLogItem[] = raw ? JSON.parse(raw) : [];
        list.unshift(record);
        await AsyncStorage.setItem(STORAGE_AUDIT_LOGS_KEY, JSON.stringify(list.slice(0, 1000)));
    } catch (e) {
        console.warn('Failed to save audit log locally', e);
    }
}

export async function fetchFinanceAuditLogs(entityId?: string): Promise<FinanceAuditLogItem[]> {
    let remoteLogs: FinanceAuditLogItem[] = [];
    try {
        let query = supabase.from('finance_audit_logs').select('*').order('created_at', { ascending: false });
        if (entityId) query = query.eq('entity_id', entityId);
        const { data, error } = await query;
        if (!error && data) remoteLogs = data;
    } catch {}

    try {
        const raw = await AsyncStorage.getItem(STORAGE_AUDIT_LOGS_KEY);
        const list: FinanceAuditLogItem[] = raw ? JSON.parse(raw) : [];
        const merged = new Map(remoteLogs.map(log => [log.id, log]));
        list.forEach(log => {
            const remote = merged.get(log.id);
            merged.set(log.id, {
                ...remote,
                ...log,
                details: { ...(remote?.details || {}), ...(log.details || {}) },
            });
        });
        return [...merged.values()]
            .filter(log => !entityId || log.entity_id === entityId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch {
        return remoteLogs;
    }
}

/**
 * Determine if a Request is eligible for Consolidation
 * - Must be fully approved based on the actual Approval Matrix chain
 * - Must not be Rejected, Cancelled, or already in an active Consolidation
 */
export function isRequestEligibleForConsolidation(
    request: any,
    approvalMatrix: FinanceApprovalMatrixSettings = DEFAULT_FINANCE_APPROVAL_MATRIX_SETTINGS,
    activeConsolidations: PurchasingConsolidationItem[] = []
): boolean {
    if (!request || !request.id) return false;

    // Check status
    const approvalStatus = (request.approval_status || '').toUpperCase();
    const financialStatus = (request.financial_status || '').toUpperCase();
    const isApproved = approvalStatus === 'APPROVED' || request.status === 'Approved';

    if (!isApproved) return false;
    if (financialStatus === 'PAID' || request.status === 'Paid') return false;
    if (approvalStatus === 'REJECTED' || approvalStatus === 'CANCELLED') return false;

    // Check if already in an active (non-cancelled) consolidation
    const isAssigned = activeConsolidations.some(c => 
        c.status !== 'Cancelled' && c.status !== 'Rejected' && c.request_ids?.includes(request.id)
    );
    if (isAssigned) return false;

    return true;
}

/**
 * Fetch all Consolidations
 */
export async function fetchPurchasingConsolidations(
    userId: string,
    isTeam: boolean = true
): Promise<PurchasingConsolidationItem[]> {
    const [allRequests, documentRules, approvalMatrix, auditLogs] = await Promise.all([
        fetchPurchasingRequests(userId, true),
        getFinanceDocumentRules(),
        getFinanceApprovalMatrixSettings(),
        fetchFinanceAuditLogs(),
    ]);

    const requestMap = new Map<string, any>(allRequests.map(r => [r.id, r]));
    const storedOverrides: Record<string, Record<string, ConsolidationRequestOverride>> = JSON.parse(
        (await AsyncStorage.getItem(STORAGE_CONSOLIDATION_OVERRIDES_KEY)) || '{}'
    );

    let consolidations: any[] = [];

    // 1. Try fetching from Supabase table
    try {
        const { data: dbConsolidations, error } = await supabase
            .from('purchasing_consolidations')
            .select(`
                id, document_number, status, notes, rejection_reason, created_by,
                submitted_at, approved_at, approved_by, created_at, updated_at,
                members:purchasing_consolidation_requests(request_id, payment_status)
            `)
            .order('created_at', { ascending: false });

        if (!error && dbConsolidations) {
            consolidations = dbConsolidations.map((c: any) => ({
                id: c.id,
                document_number: c.document_number,
                status: c.status || 'Draft',
                notes: c.notes,
                rejection_reason: c.rejection_reason,
                created_by: c.created_by,
                submitted_at: c.submitted_at,
                approved_at: c.approved_at,
                approved_by: c.approved_by,
                created_at: c.created_at,
                updated_at: c.updated_at,
                request_ids: (c.members || []).map((m: any) => m.request_id),
            }));
        }
    } catch {
        // Fall through to local storage
    }

    // 2. If Supabase table is empty or not yet created, load from AsyncStorage
    if (consolidations.length === 0) {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_CONSOLIDATIONS_KEY);
            if (raw) {
                consolidations = JSON.parse(raw);
            }
        } catch (e) {
            console.warn('Failed to load local consolidations', e);
        }
    }

    // Map each consolidation with live request children and calculated amounts
    const result: PurchasingConsolidationItem[] = consolidations.map((c: any) => {
        const consolidationOverrides = storedOverrides[c.id] || {};
        const relatedAudits = auditLogs.filter(a => a.entity_id === c.id);
        const memberRequests = (c.request_ids || [])
            .map((reqId: string) => {
                const original = requestMap.get(reqId);
                const override = consolidationOverrides[reqId];
                if (!original || !override) return original;
                const items = (original.items || []).map((item: any, index: number) => ({
                    ...item,
                    ...(override.items?.[index] || {}),
                }));
                return {
                    ...original,
                    ...override,
                    items,
                    source_of_fund_id: original.source_of_fund_id || override.source_of_fund_id,
                    payment_date: original.payment_date || override.payment_date,
                    _consolidationUpdated: true,
                    _originalRequest: original,
                };
            })
            .filter(Boolean)
            .map((request: any) => {
                const requestAmount = Number(request.amount || 0);
                const isFullyPaid = request.financial_status === 'PAID' || request.status === 'Paid';
                const installmentTotal = auditLogs
                    .filter(a => a.entity_id === request.id && a.action === 'payment_processed')
                    .reduce((sum, audit) => sum + Number(audit.details?.amount || 0), 0);
                const paymentHistory = auditLogs
                    .filter(a => a.entity_id === request.id && ['payment_processed', 'marked_paid'].includes(a.action))
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                return {
                    ...request,
                    _paid_amount: isFullyPaid ? requestAmount : Math.min(requestAmount, installmentTotal),
                    _payment_history: paymentHistory,
                };
            });

        const totalAmount = memberRequests.reduce((sum: number, req: any) => {
            const amt = typeof req.amount === 'number' ? req.amount : (parseFloat(req.amount) || 0);
            return sum + amt;
        }, 0);

        const itemsCount = memberRequests.reduce((sum: number, req: any) => {
            return sum + (req.items?.length || 1);
        }, 0);

        const paidRequests = memberRequests.filter((req: any) => Number(req._paid_amount || 0) >= Number(req.amount || 0));

        const totalPaidAmount = memberRequests.reduce((sum: number, req: any) => sum + Number(req._paid_amount || 0), 0);

        // Derive payment status if approved/paying
        let computedStatus: PurchasingConsolidationStatus = c.status;
        if (c.status !== 'Draft' && c.status !== 'Revision' && c.status !== 'Pending' && c.status !== 'Rejected' && c.status !== 'Cancelled') {
            if (memberRequests.length > 0 && paidRequests.length === memberRequests.length) {
                computedStatus = 'Paid';
            } else if (totalPaidAmount > 0) {
                computedStatus = 'Partially Paid';
            } else if (c.status === 'Paying') {
                computedStatus = 'Paying';
            } else {
                computedStatus = 'Approved';
            }
        }

        const approvalChain = evaluateApprovalChain(
            'purchasing_consolidation',
            null,
            totalAmount,
            approvalMatrix
        );

        const finalApproval = relatedAudits.find(a => a.action === 'approved');
        const paymentApprovalChain = evaluateApprovalChain(
            'purchasing_payment',
            null,
            Number(finalApproval?.details?.approved_amount) || totalAmount,
            approvalMatrix
        );
        const hasActiveApproval = ['Approved', 'Paying', 'Partially Paid', 'Paid'].includes(computedStatus);

        return {
            id: c.id,
            document_number: c.document_number,
            status: computedStatus,
            statusTag: computedStatus.toLowerCase().replace(/\s+/g, '_'),
            created_at: c.created_at,
            updated_at: c.updated_at || c.created_at,
            submitted_at: c.submitted_at,
            approved_at: c.approved_at,
            approved_by: c.approved_by,
            created_by: c.created_by,
            notes: c.notes,
            rejection_reason: c.rejection_reason,
            requests: memberRequests,
            request_ids: c.request_ids || [],
            total_amount: totalAmount,
            approved_amount: hasActiveApproval ? finalApproval?.details?.approved_amount : undefined,
            approval_note: hasActiveApproval ? finalApproval?.details?.approval_note : undefined,
            items_count: itemsCount,
            paid_requests_count: paidRequests.length,
            total_paid_amount: totalPaidAmount,
            approval_chain: approvalChain,
            payment_approval_chain: paymentApprovalChain,
            audit_trail: relatedAudits,
        };
    });

    return result;
}

/**
 * Save consolidations list locally for persistence
 */
async function persistConsolidationsLocally(list: any[]): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_CONSOLIDATIONS_KEY, JSON.stringify(list));
    } catch (e) {
        console.warn('Failed to persist consolidations locally', e);
    }
}

/**
 * Generate Next Document Number for Purchasing Consolidation
 */
export async function getNextConsolidationNumber(): Promise<string> {
    const docRules = await getFinanceDocumentRules();
    const raw = await AsyncStorage.getItem(STORAGE_CONSOLIDATIONS_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const seq = list.length + 1;
    return generateDocumentCode('purchasing_consolidation', new Date(), seq, docRules);
}

/**
 * Create a new Purchasing Consolidation from selected Requests
 */
export async function createPurchasingConsolidation(
    userId: string,
    requestIds: string[],
    userName: string = 'Authorized Officer'
): Promise<PurchasingConsolidationItem> {
    if (!requestIds || requestIds.length === 0) {
        throw new Error('Please select at least one approved Request to consolidate.');
    }

    // Verify none of the requests are already in an active consolidation
    const existingConsolidations = await fetchPurchasingConsolidations(userId, true);
    for (const reqId of requestIds) {
        const alreadyIn = existingConsolidations.find(c => 
            c.status !== 'Cancelled' && c.status !== 'Rejected' && c.request_ids?.includes(reqId)
        );
        if (alreadyIn) {
            throw new Error(`Request is already part of active consolidation ${alreadyIn.document_number}.`);
        }
    }

    const docNumber = await getNextConsolidationNumber();
    const newId = `con-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    const newConsolidation = {
        id: newId,
        document_number: docNumber,
        status: 'Draft' as PurchasingConsolidationStatus,
        created_by: userId,
        request_ids: requestIds,
        created_at: now,
        updated_at: now,
    };

    // Try inserting into Supabase tables
    try {
        await supabase.from('purchasing_consolidations').insert([{
            id: newId,
            document_number: docNumber,
            status: 'Draft',
            created_by: userId,
            created_at: now,
            updated_at: now,
        }]);

        const memberInserts = requestIds.map(reqId => ({
            consolidation_id: newId,
            request_id: reqId,
            payment_status: 'Pending',
        }));
        await supabase.from('purchasing_consolidation_requests').insert(memberInserts);
    } catch {}

    // Persist locally
    const raw = await AsyncStorage.getItem(STORAGE_CONSOLIDATIONS_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    list.unshift(newConsolidation);
    await persistConsolidationsLocally(list);

    // Audit log
    await logFinanceAudit(
        'purchasing_consolidation',
        newId,
        'created',
        userId,
        userName,
        { document_number: docNumber, request_count: requestIds.length, request_ids: requestIds }
    );

    const refreshed = await fetchPurchasingConsolidations(userId, true);
    return refreshed.find(c => c.id === newId)!;
}

/**
 * Add Requests to an existing Draft Consolidation
 */
export async function addRequestsToDraftConsolidation(
    consolidationId: string,
    requestIds: string[],
    userId: string,
    userName: string = 'Authorized Officer'
): Promise<void> {
    const raw = await AsyncStorage.getItem(STORAGE_CONSOLIDATIONS_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex(c => c.id === consolidationId);
    if (index === -1) throw new Error('Consolidation not found');

    const consolidation = list[index];
    if (!['Draft', 'Revision'].includes(consolidation.status)) {
        throw new Error('Requests can only be added while Consolidation is in Draft status.');
    }

    const currentIds = new Set(consolidation.request_ids || []);
    requestIds.forEach(id => currentIds.add(id));
    consolidation.request_ids = Array.from(currentIds);
    consolidation.updated_at = new Date().toISOString();

    list[index] = consolidation;
    await persistConsolidationsLocally(list);

    // Try Supabase insert
    try {
        const memberInserts = requestIds.map(reqId => ({
            consolidation_id: consolidationId,
            request_id: reqId,
            payment_status: 'Pending',
        }));
        await supabase.from('purchasing_consolidation_requests').insert(memberInserts);
    } catch {}

    await logFinanceAudit(
        'purchasing_consolidation',
        consolidationId,
        'requests_added',
        userId,
        userName,
        { added_request_ids: requestIds, total_requests: consolidation.request_ids.length }
    );
}

/**
 * Remove a Request from a Draft Consolidation (releasing the Request)
 */
export async function removeRequestFromDraftConsolidation(
    consolidationId: string,
    requestId: string,
    userId: string,
    userName: string = 'Authorized Officer'
): Promise<void> {
    const raw = await AsyncStorage.getItem(STORAGE_CONSOLIDATIONS_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex(c => c.id === consolidationId);
    if (index === -1) throw new Error('Consolidation not found');

    const consolidation = list[index];
    if (!['Draft', 'Revision'].includes(consolidation.status)) {
        throw new Error('Requests can only be removed while Consolidation is in Draft status.');
    }

    consolidation.request_ids = (consolidation.request_ids || []).filter((id: string) => id !== requestId);
    consolidation.updated_at = new Date().toISOString();

    list[index] = consolidation;
    await persistConsolidationsLocally(list);

    // Try Supabase delete
    try {
        await supabase
            .from('purchasing_consolidation_requests')
            .delete()
            .eq('consolidation_id', consolidationId)
            .eq('request_id', requestId);
    } catch {}

    const overrides = JSON.parse((await AsyncStorage.getItem(STORAGE_CONSOLIDATION_OVERRIDES_KEY)) || '{}');
    if (overrides[consolidationId]?.[requestId]) {
        delete overrides[consolidationId][requestId];
        await AsyncStorage.setItem(STORAGE_CONSOLIDATION_OVERRIDES_KEY, JSON.stringify(overrides));
    }

    await logFinanceAudit(
        'purchasing_consolidation',
        consolidationId,
        'request_removed',
        userId,
        userName,
        { removed_request_id: requestId, remaining_requests: consolidation.request_ids.length }
    );
}

export async function updateConsolidationRequestOverride(
    consolidationId: string,
    requestId: string,
    values: ConsolidationRequestOverride | null,
    userId: string,
    userName: string = 'Authorized Officer'
): Promise<void> {
    const raw = await AsyncStorage.getItem(STORAGE_CONSOLIDATIONS_KEY);
    const consolidation = (raw ? JSON.parse(raw) : []).find((item: any) => item.id === consolidationId);
    if (consolidation && !['Draft', 'Revision'].includes(consolidation.status)) {
        throw new Error('Consolidation Requests can only be edited while the Consolidation is in Draft status.');
    }

    const overrides = JSON.parse((await AsyncStorage.getItem(STORAGE_CONSOLIDATION_OVERRIDES_KEY)) || '{}');
    overrides[consolidationId] = overrides[consolidationId] || {};
    if (values) overrides[consolidationId][requestId] = values;
    else delete overrides[consolidationId][requestId];
    await AsyncStorage.setItem(STORAGE_CONSOLIDATION_OVERRIDES_KEY, JSON.stringify(overrides));

    await logFinanceAudit(
        'purchasing_consolidation',
        consolidationId,
        'request_updated',
        userId,
        userName,
        { request_id: requestId }
    );
}

async function findOrFetchConsolidationIndex(list: any[], consolidationId: string): Promise<number> {
    let index = list.findIndex(c => c.id === consolidationId);
    if (index !== -1) return index;

    try {
        const { data: dbItem } = await supabase
            .from('purchasing_consolidations')
            .select(`
                id, document_number, status, notes, rejection_reason, created_by,
                submitted_at, approved_at, approved_by, created_at, updated_at,
                members:purchasing_consolidation_requests(request_id, payment_status)
            `)
            .eq('id', consolidationId)
            .maybeSingle();

        if (dbItem) {
            const item = {
                id: dbItem.id,
                document_number: dbItem.document_number,
                status: dbItem.status || 'Draft',
                notes: dbItem.notes,
                rejection_reason: dbItem.rejection_reason,
                created_by: dbItem.created_by,
                submitted_at: dbItem.submitted_at,
                approved_at: dbItem.approved_at,
                approved_by: dbItem.approved_by,
                created_at: dbItem.created_at,
                updated_at: dbItem.updated_at,
                request_ids: (dbItem.members || []).map((m: any) => m.request_id),
            };
            list.unshift(item);
            return 0;
        }
    } catch {}

    return -1;
}

/**
 * Cancel Consolidation (Releases all contained requests back to the pool)
 */
export async function cancelPurchasingConsolidation(
    consolidationId: string,
    userId: string,
    userName: string = 'Authorized Officer'
): Promise<void> {
    const raw = await AsyncStorage.getItem(STORAGE_CONSOLIDATIONS_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const index = await findOrFetchConsolidationIndex(list, consolidationId);
    if (index === -1) throw new Error('Consolidation not found');

    const consolidation = list[index];
    const releasedRequests = [...(consolidation.request_ids || [])];
    
    consolidation.status = 'Cancelled';
    consolidation.updated_at = new Date().toISOString();

    list[index] = consolidation;
    await persistConsolidationsLocally(list);

    try {
        await supabase
            .from('purchasing_consolidations')
            .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
            .eq('id', consolidationId);
    } catch {}

    await logFinanceAudit(
        'purchasing_consolidation',
        consolidationId,
        'cancelled',
        userId,
        userName,
        { released_request_ids: releasedRequests }
    );
}

/**
 * Permanently Delete a Consolidation
 */
export async function deletePurchasingConsolidation(
    consolidationId: string,
    userId?: string,
    userName: string = 'Authorized Officer'
): Promise<void> {
    const raw = await AsyncStorage.getItem(STORAGE_CONSOLIDATIONS_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const updated = list.filter(c => c.id !== consolidationId);
    await persistConsolidationsLocally(updated);

    try {
        const overridesRaw = await AsyncStorage.getItem(STORAGE_CONSOLIDATION_OVERRIDES_KEY);
        if (overridesRaw) {
            const overrides = JSON.parse(overridesRaw);
            delete overrides[consolidationId];
            await AsyncStorage.setItem(STORAGE_CONSOLIDATION_OVERRIDES_KEY, JSON.stringify(overrides));
        }
    } catch {}

    try {
        await supabase
            .from('purchasing_consolidation_requests')
            .delete()
            .eq('consolidation_id', consolidationId);

        await supabase
            .from('purchasing_consolidations')
            .delete()
            .eq('id', consolidationId);
    } catch {}

    await logFinanceAudit(
        'purchasing_consolidation',
        consolidationId,
        'deleted',
        userId,
        userName
    );
}

/**
 * Submit Draft Consolidation for Approval
 */
export async function submitPurchasingConsolidation(
    consolidationId: string,
    userId: string,
    userName: string = 'Authorized Officer'
): Promise<void> {
    const raw = await AsyncStorage.getItem(STORAGE_CONSOLIDATIONS_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const index = await findOrFetchConsolidationIndex(list, consolidationId);
    if (index === -1) throw new Error('Consolidation not found');

    const consolidation = list[index];
    if (!['Draft', 'Revision'].includes(consolidation.status)) {
        throw new Error('Only Draft consolidations can be submitted.');
    }

    if (!consolidation.request_ids || consolidation.request_ids.length === 0) {
        throw new Error('Cannot submit an empty consolidation. Please add at least one request.');
    }

    const now = new Date().toISOString();
    consolidation.status = 'Pending';
    consolidation.revision_reason = null;
    consolidation.submitted_at = now;
    consolidation.updated_at = now;

    list[index] = consolidation;
    await persistConsolidationsLocally(list);

    try {
        await supabase
            .from('purchasing_consolidations')
            .update({ status: 'Pending', submitted_at: now, updated_at: now })
            .eq('id', consolidationId);
    } catch {}

    await logFinanceAudit(
        'purchasing_consolidation',
        consolidationId,
        'submitted',
        userId,
        userName,
        { submitted_at: now, request_count: consolidation.request_ids.length }
    );
}

export async function cancelPurchasingConsolidationSubmission(
    consolidationId: string,
    userId: string,
    userName: string = 'Authorized Officer'
): Promise<void> {
    const raw = await AsyncStorage.getItem(STORAGE_CONSOLIDATIONS_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const index = await findOrFetchConsolidationIndex(list, consolidationId);
    if (index === -1) throw new Error('Consolidation not found');
    if (list[index].status !== 'Pending') throw new Error('Only a pending submission can be cancelled.');

    const now = new Date().toISOString();
    list[index] = { ...list[index], status: 'Draft', submitted_at: null, updated_at: now };
    await persistConsolidationsLocally(list);

    try {
        await supabase
            .from('purchasing_consolidations')
            .update({ status: 'Draft', submitted_at: null, updated_at: now })
            .eq('id', consolidationId);
    } catch {}

    await logFinanceAudit('purchasing_consolidation', consolidationId, 'submission_cancelled', userId, userName);
}

export async function cancelPurchasingConsolidationApproval(
    consolidationId: string,
    userId: string,
    userName: string = 'Approver'
): Promise<void> {
    const raw = await AsyncStorage.getItem(STORAGE_CONSOLIDATIONS_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const index = await findOrFetchConsolidationIndex(list, consolidationId);
    if (index === -1) throw new Error('Consolidation not found');
    if (list[index].status !== 'Approved') throw new Error('Only an approved Consolidation can have its approval cancelled.');

    const now = new Date().toISOString();
    list[index] = {
        ...list[index],
        status: 'Pending',
        approved_at: null,
        approved_by: null,
        approved_amount: undefined,
        approval_note: undefined,
        updated_at: now,
    };
    await persistConsolidationsLocally(list);
    try {
        await supabase.from('purchasing_consolidations').update({ status: 'Pending', approved_at: null, approved_by: null, updated_at: now }).eq('id', consolidationId);
    } catch {}
    await logFinanceAudit('purchasing_consolidation', consolidationId, 'approval_cancelled', userId, userName);
}

/**
 * Approve Consolidation
 */
export async function approvePurchasingConsolidation(
    consolidationId: string,
    userId: string,
    userName: string = 'Approver',
    levelIndex: number = 0,
    totalLevels: number = 1,
    approvedAmount?: number,
    approvalNote?: string
): Promise<void> {
    const raw = await AsyncStorage.getItem(STORAGE_CONSOLIDATIONS_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const index = await findOrFetchConsolidationIndex(list, consolidationId);
    if (index === -1) throw new Error('Consolidation not found');

    const consolidation = list[index];
    if (consolidation.status !== 'Pending') throw new Error('Only pending Consolidations can be approved.');
    const now = new Date().toISOString();
    const isFinalLevel = levelIndex >= totalLevels - 1;
    consolidation.status = isFinalLevel ? 'Approved' : 'Pending';
    if (isFinalLevel) {
        consolidation.approved_at = now;
        consolidation.approved_by = userId;
        consolidation.approved_amount = approvedAmount || undefined;
        consolidation.approval_note = approvalNote || undefined;
    }
    consolidation.updated_at = now;

    list[index] = consolidation;
    await persistConsolidationsLocally(list);

    try {
        await supabase
            .from('purchasing_consolidations')
            .update(isFinalLevel
                ? { status: 'Approved', approved_at: now, approved_by: userId, updated_at: now }
                : { updated_at: now })
            .eq('id', consolidationId);
    } catch {}

    await logFinanceAudit(
        'purchasing_consolidation',
        consolidationId,
        isFinalLevel ? 'approved' : 'approval_level_approved',
        userId,
        userName,
        { approved_at: now, approval_level: levelIndex, approved_amount: approvedAmount, approval_note: approvalNote }
    );
}

export async function revisePurchasingConsolidation(
    consolidationId: string,
    reason: string,
    userId: string,
    userName: string = 'Approver'
): Promise<void> {
    const raw = await AsyncStorage.getItem(STORAGE_CONSOLIDATIONS_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const index = await findOrFetchConsolidationIndex(list, consolidationId);
    if (index === -1) throw new Error('Consolidation not found');
    if (list[index].status !== 'Pending') throw new Error('Only pending Consolidations can be revised.');

    const now = new Date().toISOString();
    list[index] = { ...list[index], status: 'Revision', revision_reason: reason, submitted_at: null, updated_at: now };
    await persistConsolidationsLocally(list);
    try {
        await supabase.from('purchasing_consolidations').update({ status: 'Revision', submitted_at: null, updated_at: now }).eq('id', consolidationId);
    } catch {}
    await logFinanceAudit('purchasing_consolidation', consolidationId, 'revision_requested', userId, userName, { reason });
}

/**
 * Reject Consolidation
 */
export async function rejectPurchasingConsolidation(
    consolidationId: string,
    reason: string,
    userId: string,
    userName: string = 'Approver'
): Promise<void> {
    const raw = await AsyncStorage.getItem(STORAGE_CONSOLIDATIONS_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const index = await findOrFetchConsolidationIndex(list, consolidationId);
    if (index === -1) throw new Error('Consolidation not found');

    const consolidation = list[index];
    const now = new Date().toISOString();
    consolidation.status = 'Rejected';
    consolidation.rejection_reason = reason;
    consolidation.updated_at = now;

    list[index] = consolidation;
    await persistConsolidationsLocally(list);

    try {
        await supabase
            .from('purchasing_consolidations')
            .update({ status: 'Rejected', rejection_reason: reason, updated_at: now })
            .eq('id', consolidationId);
    } catch {}

    await logFinanceAudit(
        'purchasing_consolidation',
        consolidationId,
        'rejected',
        userId,
        userName,
        { reason, rejected_at: now }
    );
}

/**
 * Process Batch Payment for Requests in the SAME Consolidation
 * Strict rule: All request IDs must belong to the specified consolidationId.
 */
export async function payConsolidationRequestsBatch(
    userId: string,
    consolidationId: string,
    requestIds: string[],
    payload: PaymentBatchPayload,
    userName: string = 'Payer'
): Promise<void> {
    if (!requestIds || requestIds.length === 0) {
        throw new Error('Please select at least one request to pay.');
    }

    // 1. Verify all requests belong to the same consolidation
    const raw = await AsyncStorage.getItem(STORAGE_CONSOLIDATIONS_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const consolidation = list.find(c => c.id === consolidationId);
    if (!consolidation) throw new Error('Consolidation not found.');

    const memberSet = new Set(consolidation.request_ids || []);
    for (const reqId of requestIds) {
        if (!memberSet.has(reqId)) {
            throw new Error(`Payment batch cannot cross consolidations! Request ${reqId} is not in consolidation ${consolidation.document_number}.`);
        }
    }

    // 2. Resolve the outstanding balance for every selected request.
    const [allRequests, auditLogs, sourceResult] = await Promise.all([
        fetchPurchasingRequests(userId, true),
        fetchFinanceAuditLogs(),
        supabase
            .from('funding_sources')
            .select('id, balance, name, provider')
            .eq('id', payload.source_of_fund_id)
            .single(),
    ]);
    const { data: source, error: sourceError } = sourceResult;

    if (sourceError || !source) throw new Error('Funding source not found.');
    if (payload.amount <= 0) throw new Error('Invalid payment amount.');

    const requestMap = new Map(allRequests.map(request => [request.id, request]));
    const selected = requestIds.map(requestId => {
        const request: any = requestMap.get(requestId);
        if (!request) throw new Error(`Request ${requestId} not found.`);
        const requestAmount = Number(payload.request_amounts?.[requestId] ?? request.amount ?? 0);
        const isFullyPaid = request.financial_status === 'PAID' || request.status === 'Paid';
        const previouslyPaid = isFullyPaid ? requestAmount : auditLogs
            .filter(audit => audit.entity_id === requestId && audit.action === 'payment_processed')
            .reduce((sum, audit) => sum + Number(audit.details?.amount || 0), 0);
        return { requestId, requestAmount, previouslyPaid: Math.min(requestAmount, previouslyPaid) };
    });
    const selectedOutstanding = selected.reduce((sum, request) => sum + Math.max(0, request.requestAmount - request.previouslyPaid), 0);
    if (payload.amount > selectedOutstanding) throw new Error('Payment exceeds the selected outstanding balance.');

    let amountToAllocate = payload.amount;
    const allocations = selected.map(request => {
        const outstanding = Math.max(0, request.requestAmount - request.previouslyPaid);
        const amount = Math.min(outstanding, amountToAllocate);
        amountToAllocate -= amount;
        return { ...request, amount, cumulativePaid: request.previouslyPaid + amount };
    }).filter(allocation => allocation.amount > 0);

    const newBalance = (source.balance || 0) - payload.amount;
    if (newBalance < 0) throw new Error('Insufficient funding source balance.');

    // 3. Apply the installment to each selected request in order.
    for (const allocation of allocations) {
        const isFullyPaid = allocation.cumulativePaid >= allocation.requestAmount;
        await updatePurchasingStatus(allocation.requestId, {
            approval_status: 'APPROVED',
            // The database constraint only accepts UNPAID/PAID. Installment state
            // is derived from payment audit totals until the request is fully paid.
            financial_status: isFullyPaid ? 'PAID' : 'UNPAID',
            source_of_fund_id: payload.source_of_fund_id,
            payment_date: payload.payment_date,
            payment_proof_url: payload.payment_proof_url,
        });

        await logFinanceAudit(
            'purchasing_request',
            allocation.requestId,
            'payment_processed',
            userId,
            userName,
            {
                consolidation_id: consolidationId,
                payment_date: payload.payment_date,
                amount: allocation.amount,
                cumulative_paid: allocation.cumulativePaid,
                remaining_amount: Math.max(0, allocation.requestAmount - allocation.cumulativePaid),
                payment_status: isFullyPaid ? 'Paid' : 'Partially Paid',
                source_of_fund_id: source.id,
                source_of_fund_name: source.provider ? `${source.provider} · ${source.name}` : source.name,
                payment_notes: payload.notes,
                payment_proof_url: payload.payment_proof_url,
            }
        );
    }

    // 4. Update funding source balance & log transaction
    await supabase
        .from('funding_sources')
        .update({ balance: newBalance })
        .eq('id', payload.source_of_fund_id);

    const docRules = await getFinanceDocumentRules();
    const paymentDocCode = generateDocumentCode('purchasing_payment', new Date(), Date.now() % 10000, docRules);

    await supabase.from('funding_source_transactions').insert([{
        funding_source_id: payload.source_of_fund_id,
        type: 'PAYMENT',
        amount: payload.amount,
        description: `Payment for ${consolidation.document_number} (${requestIds.length} requests) [${paymentDocCode}]`,
        performed_by: userId,
    }]);

    // 5. Update consolidation status
    const allocationMap = new Map(allocations.map(allocation => [allocation.requestId, allocation.cumulativePaid]));
    const allRequestsPaid = consolidation.request_ids.every((id: string) => {
        const request: any = requestMap.get(id);
        if (!request) return false;
        const requestAmount = Number(payload.request_amounts?.[id] ?? request.amount ?? 0);
        if (allocationMap.has(id)) return Number(allocationMap.get(id)) >= requestAmount;
        if (request.financial_status === 'PAID' || request.status === 'Paid') return true;
        const previouslyPaid = auditLogs
            .filter(audit => audit.entity_id === id && audit.action === 'payment_processed')
            .reduce((sum, audit) => sum + Number(audit.details?.amount || 0), 0);
        return previouslyPaid >= requestAmount;
    });
    consolidation.status = allRequestsPaid ? 'Paid' : 'Partially Paid';
    consolidation.updated_at = new Date().toISOString();
    await persistConsolidationsLocally(list);

    try {
        await supabase
            .from('purchasing_consolidations')
            .update({ status: consolidation.status, updated_at: new Date().toISOString() })
            .eq('id', consolidationId);
    } catch {}

    // 6. Audit record
    await logFinanceAudit(
        'purchasing_consolidation',
        consolidationId,
        'payment_batch_processed',
        userId,
        userName,
        {
            payment_number: paymentDocCode,
            paid_request_ids: requestIds,
            amount: payload.amount,
            source_of_fund_name: source.provider ? `${source.provider} · ${source.name}` : source.name,
            source_of_fund_id: source.id,
            payment_date: payload.payment_date,
            payment_notes: payload.notes,
            payment_proof_url: payload.payment_proof_url,
            consolidation_status: consolidation.status,
        }
    );
}
