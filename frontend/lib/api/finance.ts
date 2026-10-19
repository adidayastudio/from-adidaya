import { assertFinanceMutation } from '@/lib/financeAccess';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchOrganizationDepartments, getFinanceCategories, getFinanceDocumentRules } from './financeSetup';
import { formatPurchasingReference, formatPurchasingShortReference, readPurchasingNotes, writePurchasingNotes } from '../financeRequestPresentation';
import { supabase } from '../supabase';
import { decode } from 'base64-arraybuffer';

export interface PurchasingItem {
    name: string;
    qty: number;
    unit: string;
    unit_price: number;
    total: number;
}

export interface PurchasingRequest {
    title?: string;
    department_id?: string | null;
    id?: string;
    project_id?: string | null;
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
    target_date?: string | null;
    items?: PurchasingItem[];
    invoices?: { invoice_url: string, invoice_name: string }[];
}

export interface ReimburseItem {
    name: string;
    qty: number;
    unit: string;
    unitPrice: number;
    total: number;
}

export interface ReimburseRequest {
    id?: string;
    title?: string;
    department_id?: string | null;
    project_id?: string | null;
    category: string;
    subcategory?: string;
    date: string;
    description: string;
    amount: number;
    status?: string;
    invoice_url?: string;
    /** Stored inside notes metadata until the database has a dedicated expense-proof column. */
    expense_proof_url?: string;
    invoice_number?: string;
    vendor?: string;
    subtotal_amount?: number;
    discount_type?: string;
    discount_value?: number;
    discount_amount?: number;
    tax_name?: string;
    tax_type?: string;
    tax_rate?: number;
    tax_amount?: number;
    notes?: string;
    beneficiary_bank?: string;
    beneficiary_number?: string;
    beneficiary_name?: string;
    target_date?: string | null;
    priority?: string;
    items?: ReimburseItem[];
}

export const PURCHASING_COLUMNS = `
    id, project_id, date, vendor, description, type, subcategory, amount, approval_status, purchase_stage, 
    financial_status, source_of_fund_id, payment_date, invoice_url, notes, beneficiary_bank, beneficiary_number, 
    beneficiary_name, created_by, created_at, updated_at, rejection_reason, revision_reason, payment_proof_url,
    priority, target_date, request_number, approved_amount, approved_by_name, paid_amount,
    project:projects(id, project_name, project_code, project_number),
    items:purchasing_items(id, name, qty, unit, unit_price, total),
    invoices:purchasing_invoices(id, invoice_url, invoice_name, invoice_type, notes, created_at)
`;

export const REIMBURSE_COLUMNS = `
    id, project_id, user_id, category, subcategory, date, description, amount, status, approved_amount,
    approved_by_name, payment_date, payment_proof_url, invoice_url, notes,
    rejection_reason, revision_reason, target_date, request_number, source_of_fund_id,
    beneficiary_bank, beneficiary_number, beneficiary_name, created_at, updated_at, priority,
    project:projects(id, project_name, project_code, project_number),
    items:reimbursement_items(id, name, qty, unit, unit_price, total),
    existingInvoices:reimbursement_invoices(*)
`;

function getRequestTitle(description: string | null | undefined, items: any[] | null | undefined): string {
    if (description && description.trim().length > 0) {
        return description;
    }
    const safeItems = items || [];
    if (safeItems.length > 0) {
        const names = safeItems.map(item => item.name).filter(Boolean);
        if (names.length === 1) {
            return names[0];
        } else if (names.length === 2) {
            return `${names[0]}, ${names[1]}`;
        } else if (names.length > 2) {
            return `${names[0]}, ${names[1]}, and +${names.length - 2} more`;
        }
    }
    return '';
}

function getReimbursementTitle(items: any[] | null | undefined): string {
    const names = (items || []).map(item => String(item.name || '').trim()).filter(Boolean);
    if (names.length === 0) return 'Reimbursement Request';
    if (names.length === 1) return names[0];
    const firstTwo = `${names[0]}, ${names[1]}`;
    return names.length === 2 ? firstTwo : `${firstTwo} +${names.length - 2}`;
}

const TRIP_MARKER = '<!--FINANCE_TRIP:';
const TRIP_MARKER_END = '-->';
const REIMBURSE_PROOF_MARKER = '<!--REIMBURSE_PROOF:';

export interface TripDetails {
    origin?: string;
    destination?: string;
    distance?: number;
}

export function encodeNotesWithTrip(notes: string | undefined, trip: TripDetails | undefined): string | undefined {
    const userNotes = (notes || '').trim();
    if (!trip?.origin && !trip?.destination && !trip?.distance) {
        return userNotes || undefined;
    }
    const tripBlock = `${TRIP_MARKER}${JSON.stringify(trip)}${TRIP_MARKER_END}`;
    return userNotes ? `${userNotes}\n${tripBlock}` : tripBlock;
}

export function parseTripDetailsFromNotes(notes: string | null | undefined): TripDetails | null {
    if (!notes) return null;
    const start = notes.indexOf(TRIP_MARKER);
    if (start === -1) return null;
    const jsonStart = start + TRIP_MARKER.length;
    const end = notes.indexOf(TRIP_MARKER_END, jsonStart);
    if (end === -1) return null;
    try {
        return JSON.parse(notes.slice(jsonStart, end));
    } catch {
        return null;
    }
}

export function stripTripFromNotes(notes: string | null | undefined): string {
    if (!notes) return '';
    const start = notes.indexOf(TRIP_MARKER);
    if (start === -1) return notes.trim();
    return notes.slice(0, start).trim();
}

export function parseReimbursementProofFromNotes(notes: string | null | undefined): string | null {
    return parseReimbursementMetadataFromNotes(notes)?.expense_proof_url || null;
}

function parseReimbursementMetadataFromNotes(notes: string | null | undefined): Record<string, any> | null {
    if (!notes) return null;
    const start = notes.indexOf(REIMBURSE_PROOF_MARKER);
    if (start === -1) return null;
    const valueStart = start + REIMBURSE_PROOF_MARKER.length;
    const end = notes.indexOf(TRIP_MARKER_END, valueStart);
    if (end === -1) return null;
    try {
        const parsed = JSON.parse(notes.slice(valueStart, end));
        return parsed?.url ? { expense_proof_url: parsed.url } : parsed;
    } catch {
        return null;
    }
}

function encodeReimbursementNotes(
    notes: string | undefined,
    trip: TripDetails | undefined,
    metadata: Record<string, any>,
): string | undefined {
    const withTrip = encodeNotesWithTrip(notes, trip) || '';
    const cleanMetadata = Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== ''));
    if (Object.keys(cleanMetadata).length === 0) return withTrip || undefined;
    const proofBlock = `${REIMBURSE_PROOF_MARKER}${JSON.stringify(cleanMetadata)}${TRIP_MARKER_END}`;
    return withTrip ? `${withTrip}\n${proofBlock}` : proofBlock;
}

function stripFinanceMetadataFromNotes(notes: string | null | undefined): string {
    if (!notes) return '';
    return notes
        .replace(/<!--FINANCE_TRIP:[\s\S]*?-->/g, '')
        .replace(/<!--REIMBURSE_PROOF:[\s\S]*?-->/g, '')
        .trim();
}

function validateRequestTarget(payload: { project_id?: string | null; department_id?: string | null }) {
    if (!payload.project_id && !payload.department_id) throw new Error('Select a Project or Department for this request.');
}

function reimbursementActualTotal(items: any[] | undefined, payload: Record<string, any>): number {
    if (!items?.length) return Number(payload.amount) || 0;
    const subtotal = items.reduce((sum, item) => {
        const qty = Number(item.qty);
        const unitPrice = Number(item.unitPrice ?? item.unit_price);
        if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) throw new Error('Quantity and unit price must be valid numbers.');
        return sum + (qty * unitPrice);
    }, 0);
    const discount = Number(payload.discount_amount) || 0;
    const tax = Number(payload.tax_amount) || 0;
    return subtotal - discount + (payload.tax_type === 'withholding' ? -tax : tax);
}

function validateReimbursementSubmission(payload: {
    invoice_url?: string;
    expense_proof_url?: string;
    beneficiary_bank?: string;
    beneficiary_number?: string;
    beneficiary_name?: string;
    amount?: number;
}, items?: any[]) {
    if (!items?.length || items.some(item => !String(item.name || '').trim() || !Number.isFinite(Number(item.qty)) || Number(item.qty) === 0 || !Number.isFinite(Number(item.unitPrice ?? item.unit_price)) || Number(item.unitPrice ?? item.unit_price) === 0)) {
        throw new Error('Every reimbursement item must contain an actual quantity and unit price.');
    }
    if (!payload.invoice_url) throw new Error('Invoice document is required for reimbursement.');
    if (!payload.expense_proof_url) throw new Error('Expense payment proof is required for reimbursement.');
    if (!String(payload.beneficiary_bank || '').trim() || !String(payload.beneficiary_number || '').trim() || !String(payload.beneficiary_name || '').trim()) {
        throw new Error('Complete the reimbursement destination account.');
    }
    if (!Number.isFinite(payload.amount) || payload.amount === 0) throw new Error('Actual reimbursement amount must be a valid non-zero number.');
}

function formatReferenceNumber(type: 'PO' | 'RE', project: any, requestNumber: any, id: string): string {
    const projectNum = project?.project_number !== undefined && project?.project_number !== null
        ? String(project.project_number).padStart(3, '0')
        : '000';
        
    const reqNum = requestNumber !== undefined && requestNumber !== null
        ? String(requestNumber).padStart(5, '0')
        : (id ? id.slice(0, 5) : '00000');
        
    return `${type}-${projectNum}-${reqNum}`;
}

export async function fetchPurchasingRequests(userId: string, isTeam: boolean, orgPrefix: string = 'ADY') {
    let query = supabase
        .from('purchasing_requests')
        .select(PURCHASING_COLUMNS)
        .order('created_at', { ascending: false })
        .range(0, 4999); // Override Supabase default 1000-row limit

    if (!isTeam) {
        query = query.eq('created_by', userId);
    }

    let { data, error } = await query;
    if (error) {
        console.warn("Retrying purchasing requests with fallback query due to:", error.message || error);
        let fallbackQuery = supabase
            .from('purchasing_requests')
            .select(`*, project:projects(id, project_name, project_code, project_number), items:purchasing_items(*)`)
            .order('created_at', { ascending: false })
            .range(0, 4999);
        if (!isTeam) {
            fallbackQuery = fallbackQuery.eq('created_by', userId);
        }
        const fallbackRes = await fallbackQuery;
        if (fallbackRes.error) {
            console.warn("Retrying purchasing requests with simple select * due to:", fallbackRes.error.message);
            let simpleQuery = supabase
                .from('purchasing_requests')
                .select('*')
                .order('created_at', { ascending: false })
                .range(0, 4999);
            if (!isTeam) {
                simpleQuery = simpleQuery.eq('created_by', userId);
            }
            const simpleRes = await simpleQuery;
            data = simpleRes.data;
            if (simpleRes.error) {
                console.error("Failed all purchasing requests queries:", simpleRes.error);
                return [];
            }
        } else {
            data = fallbackRes.data;
        }
    }

    if (!data || data.length === 0) return [];
    // Fallback request queries omit nested invoices. Retrieve those rows separately
    // so older requests with only the first path on the parent retain every file.
    const missingInvoiceIds = data.filter((request: any) => !Array.isArray(request.invoices)).map((request: any) => request.id);
    if (missingInvoiceIds.length) {
        const { data: invoiceRows, error: invoiceError } = await supabase.from('purchasing_invoices')
            .select('*').in('request_id', missingInvoiceIds).order('created_at', { ascending: true }).range(0, 4999);
        if (invoiceError) console.warn('Unable to load purchasing attachments:', invoiceError.message);
        else {
            const invoicesByRequest = new Map<string, any[]>();
            for (const invoice of invoiceRows || []) {
                const files = invoicesByRequest.get(invoice.request_id) || [];
                files.push(invoice);
                invoicesByRequest.set(invoice.request_id, files);
            }
            data = data.map((request: any) => Array.isArray(request.invoices) ? request
                : { ...request, invoices: invoicesByRequest.get(request.id) || [] });
        }
    }
    // Fetch profiles manually to avoid PostgREST PGRST200 join errors
    const userIds = Array.from(new Set((data || []).map((r: any) => r.created_by).filter(Boolean)));
    const profileMap = new Map<string, any>();
    if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, nickname')
            .in('id', userIds);
        if (profiles) {
            profiles.forEach((p: any) => profileMap.set(p.id, p));
        }
    }
    
    const [departments, documentRules, categories] = await Promise.all([
        fetchOrganizationDepartments(),
        getFinanceDocumentRules(),
        getFinanceCategories(),
    ]);
    const departmentMap = new Map(departments.map(department => [department.id, department]));

    // Read active consolidations to reflect requester-facing status (Consolidated / Paying / Paid)
    const requestConsolidationMap = new Map<string, { consolidationId: string; consolidationDocNumber: string; consolidationStatus: string }>();
    try {
        const rawConsolidations = await AsyncStorage.getItem('forma_finance_consolidations_v1');
        if (rawConsolidations) {
            const parsedConsolidations = JSON.parse(rawConsolidations);
            (parsedConsolidations || []).forEach((c: any) => {
                if (c.status !== 'Cancelled' && c.status !== 'Rejected') {
                    (c.request_ids || []).forEach((reqId: string) => {
                        requestConsolidationMap.set(reqId, {
                            consolidationId: c.id,
                            consolidationDocNumber: c.document_number,
                            consolidationStatus: c.status,
                        });
                    });
                }
            });
        }
    } catch {}

    // Map response to match local format
    return (data || []).map((rawReq: any) => {
        const stored = readPurchasingNotes(rawReq.notes || '');
        const req = { ...rawReq, ...stored.commercial, notes: stored.notes };
        const department = departmentMap.get(req.department_id) || (req.department_id ? { id: req.department_id, name: req.department_name || 'Department', code: req.department_code } : null);
        const profile = profileMap.get(req.created_by) || null;
        const itemsList = (req.items || []).map((item: any) => ({
            ...item,
            name: item.name || item.item_name || '',
        }));
        const inferredCategory = categories.find(category =>
            category.subcategories?.some(subcategory =>
                subcategory.id === req.subcategory || subcategory.name === req.subcategory
            )
        );
        const categoryName = (!req.type || req.type === 'General Purchasing') && inferredCategory
            ? inferredCategory.name
            : req.type;

        const conInfo = requestConsolidationMap.get(req.id);
        const isApproved = req.approval_status === 'APPROVED';
        const isPaid = req.financial_status === 'PAID';

        let derivedStatus = 'Draft';
        let derivedStatusTag = 'draft';

        if (isPaid) {
            derivedStatus = 'Paid';
            derivedStatusTag = 'paid';
        } else if (req.financial_status === 'PARTIALLY_PAID') {
            derivedStatus = 'Partially Paid'; derivedStatusTag = 'paying';
        } else if (req.approval_status === 'REJECTED' && req.revision_reason) {
            derivedStatus = 'Need Revision';
            derivedStatusTag = 'revision';
        } else if (req.approval_status === 'REJECTED') {
            derivedStatus = 'Rejected';
            derivedStatusTag = 'rejected';
        } else if (['REVISED', 'REVISION', 'NEED_REVISION'].includes(req.approval_status?.toUpperCase())) {
            derivedStatus = 'Need Revision';
            derivedStatusTag = 'revision';
        } else if (req.approval_status === 'SUBMITTED') {
            derivedStatus = 'Pending';
            derivedStatusTag = 'pending';
        } else if (isApproved) {
            if (conInfo) {
                if (['Approved', 'Paying', 'Partially Paid'].includes(conInfo.consolidationStatus)) {
                    derivedStatus = 'Paying';
                    derivedStatusTag = 'paying';
                } else {
                    derivedStatus = 'Consolidated';
                    derivedStatusTag = 'consolidated';
                }
            } else {
                derivedStatus = 'Approved';
                derivedStatusTag = 'approved';
            }
        }

        const computedTitle = req.description || getRequestTitle(req.description, itemsList) || 'Purchase Request';
        return {
            ...req,
            type: categoryName,
            items: itemsList,
            title: computedTitle,
            description: req.description || computedTitle,
            department,
            department_code: department?.code,
            department_name: department?.name,
            project: req.project?.project_code || department?.code || 'Unassigned',
            project_obj: req.project,
            ref: formatPurchasingReference(req, documentRules.purchasing.levels.request, department?.code || req.project?.project_code, orgPrefix),
            shortRef: formatPurchasingShortReference(req, documentRules.purchasing.levels.request, department?.code || req.project?.project_code),
            cardRef: formatPurchasingShortReference(req, documentRules.purchasing.levels.request),
            status: derivedStatus,
            statusTag: derivedStatusTag,
            consolidation_id: conInfo?.consolidationId,
            consolidation_doc_number: conInfo?.consolidationDocNumber,
            consolidation_status: conInfo?.consolidationStatus,
            submitted_by_name: profile?.full_name || 'Unknown',
            profile: profile,
            invoices: req.invoices || []
        };
    });
}

export async function fetchProjects() {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        console.error("Error fetching projects:", error);
        return [];
    }
    return data || [];
}

export async function createPurchasingRequest(userId: string, payload: PurchasingRequest & { category?: string; vendor_name?: string; status?: string; statusTag?: string }) {
    const { items, invoices, category, vendor_name, status, statusTag, ...rest } = payload as any;

    validateRequestTarget(rest);
    const isDraft = (status || rest.approval_status || '').toUpperCase() === 'DRAFT';
    const finalDescription = (rest.title?.trim() || rest.description?.trim() || getRequestTitle(rest.description, items).trim() || 'Purchase Request');

    const insertData: Record<string, any> = {
        project_id: rest.project_id || null,
        date: rest.date,
        target_date: rest.target_date ?? null,
        description: finalDescription,
        type: rest.type || category,
        subcategory: rest.subcategory,
        amount: rest.amount,
        vendor: rest.vendor || vendor_name,
        purchase_stage: rest.purchase_stage || 'PLANNED',
        approval_status: isDraft ? 'DRAFT' : (rest.approval_status || 'SUBMITTED'),
        financial_status: 'UNPAID',
        source_of_fund_id: rest.source_of_fund_id,
        payment_date: rest.payment_date,
        invoice_url: rest.invoice_url,
        notes: writePurchasingNotes(rest.notes, rest),
        beneficiary_bank: rest.beneficiary_bank,
        beneficiary_number: rest.beneficiary_number,
        beneficiary_name: rest.beneficiary_name,
        priority: rest.priority,
        created_by: userId,
    };

    Object.keys(insertData).forEach(key => {
        if (insertData[key] === undefined) delete insertData[key];
    });

    const { data: request, error: reqError } = await supabase
        .from('purchasing_requests')
        .insert([insertData])
        .select()
        .single();
        
    if (reqError) throw reqError;
    
    if (items && items.length > 0) {
        const itemsData = items.map((item: any) => ({
            request_id: request.id,
            name: item.name,
            qty: item.qty,
            unit: item.unit,
            unit_price: item.unit_price,
            total: item.total
        }));
        const { error: itemError } = await supabase.from('purchasing_items').insert(itemsData);
            if (itemError) throw new Error(`Request saved, but items could not be saved: ${itemError.message}. Open this request to edit and retry.`);
    }

    if (invoices && invoices.length > 0) {
        const invoicesData = invoices.map((inv: any) => ({
            request_id: request.id,
            invoice_url: inv.invoice_url,
            invoice_name: inv.invoice_name,
            invoice_type: 'INVOICE',
                notes: inv.notes || null,
            uploaded_by: userId
        }));
        const { error: attachmentError } = await supabase.from('purchasing_invoices').insert(invoicesData);
            if (attachmentError) throw new Error(`Request saved, but attachments could not be saved: ${attachmentError.message}. Open this request to edit and retry.`);
    }
    
    return request;
}

export async function updatePurchasingStatus(id: string, updates: any) {
    await assertFinanceMutation('purchasing', id, updates);
    const { error } = await supabase.from('purchasing_requests').update(updates).eq('id', id);
    if (error) throw error;
    return true;
}

function resolveEditApprovalStatus(statusTag?: string, isDraft?: boolean, currentApproval?: string) {
    if (isDraft) return 'DRAFT';
    if (statusTag === 'approved') return 'APPROVED';
    if (statusTag === 'paid') return 'APPROVED';
    if (statusTag === 'draft' || statusTag === 'revision' || statusTag === 'rejected') return 'SUBMITTED';
    return currentApproval || 'SUBMITTED';
}

function resolveEditReimburseStatus(statusTag?: string, isDraft?: boolean, currentStatus?: string) {
    if (isDraft) return 'DRAFT';
    if (statusTag === 'approved') return 'APPROVED';
    if (statusTag === 'paid') return 'PAID';
    if (statusTag === 'draft' || statusTag === 'revision' || statusTag === 'rejected') return 'PENDING';
    
    const normalizedCurrent = currentStatus?.toUpperCase();
    if (normalizedCurrent === 'SUBMITTED') return 'PENDING';
    return currentStatus || 'PENDING';
}

export async function updatePurchasingRequest(
    userId: string,
    id: string,
    payload: PurchasingRequest & { category?: string; vendor_name?: string; status?: string; statusTag?: string; isDraft?: boolean }
) {
    const { items, invoices, category, vendor_name, status, statusTag, isDraft, ...rest } = payload as any;

    if ('project_id' in rest && 'department_id' in rest) validateRequestTarget(rest);
    const approval_status = resolveEditApprovalStatus(statusTag, isDraft ?? (status?.toUpperCase() === 'DRAFT'), rest.approval_status);
    const finalDescription = (rest.title?.trim() || rest.description?.trim() || getRequestTitle(rest.description, items).trim() || 'Purchase Request');

    const updateData: Record<string, any> = {
        project_id: rest.project_id !== undefined ? (rest.project_id || null) : undefined,
        date: rest.date,
        target_date: rest.target_date ?? null,
        description: finalDescription,
        type: rest.type || category,
        subcategory: rest.subcategory,
        amount: rest.amount,
        vendor: rest.vendor || vendor_name,
        purchase_stage: rest.purchase_stage,
        approval_status,
        invoice_url: rest.invoice_url,
        notes: writePurchasingNotes(rest.notes, rest),
        beneficiary_bank: rest.beneficiary_bank,
        beneficiary_number: rest.beneficiary_number,
        beneficiary_name: rest.beneficiary_name,
        priority: rest.priority,
    };

    Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
    });

    const { error: reqError } = await supabase.from('purchasing_requests').update(updateData).eq('id', id);
    if (reqError) throw reqError;

    if (items) {
        const { error: deleteError } = await supabase.from('purchasing_items').delete().eq('request_id', id);
        if (deleteError) throw new Error(`Request updated, but previous rows could not be replaced: ${deleteError.message}`);
        if (items.length > 0) {
            const itemsData = items.map((item: any) => ({
                request_id: id,
                name: item.name,
                qty: item.qty,
                unit: item.unit,
                unit_price: item.unit_price,
                total: item.total,
            }));
            const { error: itemError } = await supabase.from('purchasing_items').insert(itemsData);
            if (itemError) throw new Error(`Request saved, but items could not be saved: ${itemError.message}. Open this request to edit and retry.`);
        }
    }

    if (invoices !== undefined) {
        const { error: deleteError } = await supabase.from('purchasing_invoices').delete().eq('request_id', id);
        if (deleteError) throw new Error(`Request updated, but previous rows could not be replaced: ${deleteError.message}`);
        if (invoices.length > 0) {
            const invoicesData = invoices.map((inv: any) => ({
                request_id: id,
                invoice_url: inv.invoice_url,
                invoice_name: inv.invoice_name,
                invoice_type: 'INVOICE',
                notes: inv.notes || null,
                uploaded_by: userId,
            }));
            const { error: attachmentError } = await supabase.from('purchasing_invoices').insert(invoicesData);
            if (attachmentError) throw new Error(`Request saved, but attachments could not be saved: ${attachmentError.message}. Open this request to edit and retry.`);
        }
    }

    return true;
}

export async function updateReimburseRequest(
    userId: string,
    id: string,
    payload: ReimburseRequest & { details?: TripDetails; statusTag?: string; isDraft?: boolean }
) {
    const { items, details, expense_proof_url, statusTag, isDraft, ...rest } = payload as any;

    if ('project_id' in rest && 'department_id' in rest) validateRequestTarget(rest);
    const dbStatus = resolveEditReimburseStatus(statusTag, isDraft ?? (rest.status?.toUpperCase() === 'DRAFT'), rest.status);
    const amount = reimbursementActualTotal(items, rest);
    const reimbursementTitle = getReimbursementTitle(items);
    if (dbStatus !== 'DRAFT') {
        validateReimbursementSubmission({ ...rest, expense_proof_url, amount }, items);
    }
    const notes = writePurchasingNotes(encodeReimbursementNotes(rest.notes, details, {
        expense_proof_url,
        invoice_number: rest.invoice_number,
        vendor: rest.vendor,
        subtotal_amount: rest.subtotal_amount,
        discount_type: rest.discount_type,
        discount_value: rest.discount_value,
        discount_amount: rest.discount_amount,
        tax_name: rest.tax_name,
        tax_type: rest.tax_type,
        tax_rate: rest.tax_rate,
        tax_amount: rest.tax_amount,
    }), rest);

    const updateData: Record<string, any> = {
        project_id: rest.project_id !== undefined ? (rest.project_id || null) : undefined,
        category: rest.category,
        subcategory: rest.subcategory,
        date: rest.date,
        description: rest.title?.trim() || rest.description?.trim() || reimbursementTitle,
        amount,
        status: dbStatus,
        invoice_url: rest.invoice_url,
        notes,
        beneficiary_bank: rest.beneficiary_bank,
        beneficiary_number: rest.beneficiary_number,
        beneficiary_name: rest.beneficiary_name,
        priority: rest.priority,
        target_date: rest.target_date ?? null,
    };

    Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
    });

    const { error: reqError } = await supabase.from('reimbursement_requests').update(updateData).eq('id', id);
    if (reqError) throw reqError;

    if (items) {
        const { error: deleteError } = await supabase.from('reimbursement_items').delete().eq('reimbursement_id', id);
        if (deleteError) throw new Error(`Request updated, but previous rows could not be replaced: ${deleteError.message}`);
        if (items.length > 0) {
            const itemsData = items.map((item: any) => ({
                reimbursement_id: id,
                name: item.name,
                qty: item.qty,
                unit: item.unit,
                unit_price: item.unitPrice ?? item.unit_price,
                total: item.total,
            }));
            const { error: itemError } = await supabase.from('reimbursement_items').insert(itemsData);
            if (itemError) throw new Error(`Request saved, but reimbursement items could not be saved: ${itemError.message}`);
        }
    }

    return true;
}

const paymentsInFlight = new Set<string>();
export async function payFinanceRequest(userId: string, id: string, type: 'purchasing' | 'reimbursement', payload: { source_of_fund_id: string; payment_date: string; payment_proof_url?: string; amount: number; ref?: string }) {
    const key = type + ':' + id;
    if (paymentsInFlight.has(key)) throw new Error('This payment is already being processed.');
    paymentsInFlight.add(key);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== userId) throw new Error('Sign in to process a payment.');
        await assertFinanceMutation(type, id, { [type === 'purchasing' ? 'financial_status' : 'status']: 'PAID' });
        const table = type === 'purchasing' ? 'purchasing_requests' : 'reimbursement_requests';
        const { data: request, error } = await supabase.from(table).select('*').eq('id', id).single();
        if (error || !request) throw new Error('Finance request not found.');
        const state = String(type === 'purchasing' ? request.financial_status : request.status).toUpperCase();
        if (state === 'PAID') throw new Error('This request has already been paid.');
        const approval = String(type === 'purchasing' ? request.approval_status : request.status).toUpperCase();
        if (!['APPROVED', 'PARTIALLY_PAID', 'PAYING'].includes(approval)) throw new Error('Approve the request before payment.');
        const total = Number(request.approved_amount ?? request.amount);
        const paid = type === 'purchasing' ? Number(request.paid_amount || 0) : 0;
        const amount = Number(payload.amount);
        if (!Number.isFinite(amount) || amount <= 0 || amount > total - paid) throw new Error('Payment amount exceeds the outstanding amount.');
        if (type === 'reimbursement' && amount !== total) throw new Error('Reimbursement must be paid in full.');
        if (!payload.source_of_fund_id || !payload.payment_date || !payload.payment_proof_url) throw new Error('Funding source, payment date and proof are required.');
        const { data: source, error: sourceError } = await supabase.from('funding_sources').select('id').eq('id', payload.source_of_fund_id).single();
        if (sourceError || !source) throw new Error('Funding source not found.');
        const finalPaid = paid + amount;
        const proofs = [...new Set([request.payment_proof_url, payload.payment_proof_url].filter(Boolean).flatMap(value => String(value).split(',').map(path => path.trim()).filter(Boolean)))].join(',');
        const updates: any = { ...(type === 'purchasing' ? { paid_amount: finalPaid } : {}), source_of_fund_id: payload.source_of_fund_id, payment_date: payload.payment_date, payment_proof_url: proofs, [type === 'purchasing' ? 'financial_status' : 'status']: finalPaid >= total ? 'PAID' : 'PARTIALLY_PAID' };
        // Preserve legacy Adidaya payment behavior: update the payment request, not an invented balance/ledger transaction.
        let update = supabase.from(table).update(updates).eq('id', id);
        if (type === 'purchasing') update = request.paid_amount == null ? update.is('paid_amount', null) : update.eq('paid_amount', request.paid_amount);
        const statusColumn = type === 'purchasing' ? 'financial_status' : 'status';
        update = request[statusColumn] == null ? update.is(statusColumn, null) : update.eq(statusColumn, request[statusColumn]);
        const { data: saved, error: updateError } = await update.select('id').maybeSingle();
        if (updateError) throw updateError;
        if (!saved) throw new Error('Request changed during payment. Refresh before retrying.');
    } finally { paymentsInFlight.delete(key); }
}


export async function fetchReimburseRequests(userId: string, isTeam: boolean, orgPrefix: string = 'ADY') {
    let query = supabase
        .from('reimbursement_requests')
        .select(REIMBURSE_COLUMNS)
        .order('created_at', { ascending: false })
        .range(0, 4999); // Override Supabase default 1000-row limit

    if (!isTeam) {
        query = query.eq('user_id', userId);
    }

    let { data, error } = await query;
    if (error) {
        console.warn("Retrying reimburse requests with fallback query due to:", error.message || error);
        let fallbackQuery = supabase
            .from('reimbursement_requests')
            .select(`*, project:projects(id, project_name, project_code, project_number), items:reimbursement_items(*)`)
            .order('created_at', { ascending: false })
            .range(0, 4999);
        if (!isTeam) {
            fallbackQuery = fallbackQuery.eq('user_id', userId);
        }
        const fallbackRes = await fallbackQuery;
        if (fallbackRes.error) {
            console.warn("Retrying reimburse requests with simple select * due to:", fallbackRes.error.message);
            let simpleQuery = supabase
                .from('reimbursement_requests')
                .select('*')
                .order('created_at', { ascending: false })
                .range(0, 4999);
            if (!isTeam) {
                simpleQuery = simpleQuery.eq('user_id', userId);
            }
            const simpleRes = await simpleQuery;
            data = simpleRes.data;
            if (simpleRes.error) {
                console.error("Failed all reimburse requests queries:", simpleRes.error);
                return [];
            }
        } else {
            data = fallbackRes.data;
        }
    }

    if (!data || data.length === 0) return [];

    // Fetch profiles manually to avoid PostgREST PGRST200 join errors
    const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean)));
    const profileMap = new Map<string, any>();
    if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, nickname')
            .in('id', userIds);
        if (profiles) {
            profiles.forEach((p: any) => profileMap.set(p.id, p));
        }
    }

    const [departments, documentRules] = await Promise.all([
        fetchOrganizationDepartments(),
        getFinanceDocumentRules(),
    ]);
    const departmentMap = new Map(departments.map(department => [department.id, department]));

    return (data || []).map((req: any) => {
        const profile = profileMap.get(req.user_id) || null;
        const itemsList = req.items || [];
        const rawStatus = (req.status || '').toUpperCase();
        const workflowStatus = rawStatus === 'PARTIALLY_PAID' ? 'Partially Paid' : rawStatus === 'CONSOLIDATED' ? 'Consolidated'
            : rawStatus === 'PAYING' ? 'Paying'
                : null;
        const tripDetails = parseTripDetailsFromNotes(req.notes);
        const cleanNotes = stripFinanceMetadataFromNotes(req.notes);
        const reimbursementMetadata = parseReimbursementMetadataFromNotes(req.notes) || {};
        const legacyDocuments = String(req.invoice_url || '').split(',').map(value => value.trim()).filter(Boolean);

        // Read department info from notes (same pattern as purchasing)
        const stored = readPurchasingNotes(cleanNotes || req.notes || '');
        const deptId = stored.commercial?.department_id || req.department_id;
        const department = departmentMap.get(deptId) || (deptId ? { id: deptId, name: stored.commercial?.department_name || 'Department', code: stored.commercial?.department_code } : null);

        return {
            ...req,
            ...stored.commercial,
            ...reimbursementMetadata,
            invoice_url: req.invoice_url,
            expense_proof_url: reimbursementMetadata.expense_proof_url || legacyDocuments.slice(1).join(',') || undefined,
            notes: stored.notes || (cleanNotes || undefined),
            details: tripDetails,
            title: req.description || getReimbursementTitle(itemsList),
            description: req.description || getReimbursementTitle(itemsList),
            department,
            department_code: department?.code,
            department_name: department?.name,
            project: req.project?.project_code || department?.code || 'Unassigned',
            project_obj: req.project,
            ref: formatPurchasingReference(req, documentRules.reimbursement?.levels?.request || { customCode: 'RR', recommendedCode: 'RR', sequenceLength: 5, sequenceScope: 'global' }, department?.code || req.project?.project_code, orgPrefix),
            shortRef: formatPurchasingShortReference({ ...req, request_number: req.request_number }, documentRules.reimbursement?.levels?.request || { customCode: 'RR', recommendedCode: 'RR', sequenceLength: 5, sequenceScope: 'global' }, department?.code || req.project?.project_code),
            cardRef: formatPurchasingShortReference({ ...req, request_number: req.request_number }, documentRules.reimbursement?.levels?.request || { customCode: 'RR', recommendedCode: 'RR', sequenceLength: 5, sequenceScope: 'global' }),
            status: workflowStatus || (rawStatus === 'PAID' ? 'Paid' : (
                rawStatus === 'APPROVED' ? 'Approved' : (
                    rawStatus === 'REJECTED' && req.revision_reason ? 'Need Revision' : (
                    rawStatus === 'REJECTED' ? 'Rejected' : (
                        ['REVISED', 'REVISION', 'NEED_REVISION'].includes(rawStatus) ? 'Need Revision' : (
                            rawStatus === 'SUBMITTED' || rawStatus === 'PENDING' ? 'Pending' : 'Draft'
                        )
                    ))
                )
            )),
            statusTag: workflowStatus ? (rawStatus === 'PARTIALLY_PAID' ? 'paying' : rawStatus.toLowerCase()) : (rawStatus === 'PAID' ? 'paid' : (
                rawStatus === 'APPROVED' ? 'approved' : (
                rawStatus === 'REJECTED' && req.revision_reason ? 'revision' : (
                rawStatus === 'REJECTED' ? 'rejected' : (
                        ['REVISED', 'REVISION', 'NEED_REVISION'].includes(rawStatus) ? 'revision' : (
                            rawStatus === 'DRAFT' ? 'draft' : 'pending'
            ))
                    )
                ))
            ),
            submitted_by_name: profile?.full_name || 'Unknown',
            profile: profile,
            items: req.items || []
        };
    });
}

export async function createReimburseRequest(userId: string, payload: ReimburseRequest & { details?: TripDetails; statusTag?: string }) {
    const { items, details, expense_proof_url, statusTag, ...rest } = payload as any;

    validateRequestTarget(rest);
    const isDraft = (rest.status || '').toUpperCase() === 'DRAFT';
    const amount = reimbursementActualTotal(items, rest);
    const reimbursementTitle = getReimbursementTitle(items);
    if (!isDraft) {
        validateReimbursementSubmission({ ...rest, expense_proof_url, amount }, items);
    }
    const notes = writePurchasingNotes(encodeReimbursementNotes(rest.notes, details, {
        expense_proof_url,
        invoice_number: rest.invoice_number,
        vendor: rest.vendor,
        subtotal_amount: rest.subtotal_amount,
        discount_type: rest.discount_type,
        discount_value: rest.discount_value,
        discount_amount: rest.discount_amount,
        tax_name: rest.tax_name,
        tax_type: rest.tax_type,
        tax_rate: rest.tax_rate,
        tax_amount: rest.tax_amount,
    }), rest);

    const insertData: Record<string, any> = {
        project_id: rest.project_id || null,
        category: rest.category,
        subcategory: rest.subcategory,
        date: rest.date,
        description: rest.title?.trim() || rest.description?.trim() || reimbursementTitle,
        amount,
        status: isDraft ? 'DRAFT' : (rest.status === 'SUBMITTED' ? 'PENDING' : (rest.status || 'PENDING')),
        invoice_url: rest.invoice_url,
        notes,
        beneficiary_bank: rest.beneficiary_bank,
        beneficiary_number: rest.beneficiary_number,
        beneficiary_name: rest.beneficiary_name,
        priority: rest.priority,
        target_date: rest.target_date ?? null,
        user_id: userId,
    };

    Object.keys(insertData).forEach(key => {
        if (insertData[key] === undefined) delete insertData[key];
    });

    const { data: request, error: reqError } = await supabase
        .from('reimbursement_requests')
        .insert([insertData])
        .select()
        .single();
        
    if (reqError) throw reqError;
    
    if (items && items.length > 0) {
        const itemsData = items.map((item: any) => ({
            reimbursement_id: request.id,
            name: item.name,
            qty: item.qty,
            unit: item.unit,
            unit_price: item.unitPrice ?? item.unit_price,
            total: item.total
        }));
        const { error: itemError } = await supabase.from('reimbursement_items').insert(itemsData);
        if (itemError) throw new Error(`Request saved, but reimbursement items could not be saved: ${itemError.message}`);
    }
    
    return request;
}

export async function updateReimburseStatus(id: string, updates: any) {
    await assertFinanceMutation('reimbursement', id, updates);
    if (String(updates.status || '').toUpperCase() === 'APPROVED') {
        const { data: request, error: requestError } = await supabase
            .from('reimbursement_requests')
            .select('amount')
            .eq('id', id)
            .single();
        if (requestError || !request) throw new Error('Reimbursement request not found');
        updates = { ...updates, approved_amount: request.amount };
    }
    const { error } = await supabase.from('reimbursement_requests').update(updates).eq('id', id);
    if (error) throw error;
    return true;
}

export async function deletePurchasingRequest(id: string) {
    await assertFinanceMutation('purchasing', id, undefined, true);
    const { error } = await supabase.from('purchasing_requests').delete().eq('id', id);
    if (error) throw error;
    return true;
}

export async function deleteReimburseRequest(id: string) {
    await assertFinanceMutation('reimbursement', id, undefined, true);
    const { error } = await supabase.from('reimbursement_requests').delete().eq('id', id);
    if (error) throw error;
    return true;
}

export async function fetchFundingSources() {
    const { data, error } = await supabase
        .from('funding_sources')
        .select('*')
        .order('position', { ascending: true });
        
    if (error) {
        console.error("Error fetching funding sources:", error);
        return [];
    }
    
    return data || [];
}

export async function fetchPettyCashPools() {
    try {
        const { data, error } = await supabase
            .from('funding_sources')
            .select('*')
            .eq('type', 'PETTY_CASH')
            .order('created_at', { ascending: false });
            
        if (error) {
            return [];
        }
        
        return (data || []).map((pool: any) => ({
            id: pool.id,
            projectId: pool.project_id || 'NA',
            projectName: pool.name || 'Petty Cash',
            balance: pool.balance || 0,
            limit: 1000000,
            status: pool.is_active ? 'active' : 'inactive',
            history: []
        }));
    } catch {
        return [];
    }
}

export async function topUpPettyCashApi(poolId: string, amount: number, description: string, userId: string) {
    // Note: In a real app this should be an RPC call or handled transactionally
    const { data: pool } = await supabase.from('funding_sources').select('balance').eq('id', poolId).single();
    if (!pool) throw new Error("Pool not found");
    
    const newBalance = (pool.balance || 0) + amount;
    
    await supabase.from('funding_sources').update({ balance: newBalance }).eq('id', poolId);
    
    await supabase.from('funding_source_transactions').insert([{
        funding_source_id: poolId,
        type: 'TOP_UP',
        amount,
        description,
        performed_by: userId
    }]);
    
    return true;
}

export async function uploadFinanceFileBase64(base64Data: string, fileExt: string, contentType: string, folder: string = 'purchasing') {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;
    
    const { data, error } = await supabase.storage
        .from('finance-documents')
        .upload(filePath, decode(base64Data), {
            contentType,
            upsert: false
        });
        
    if (error) {
        // Fallback to finance_attachments bucket if finance-documents bucket is not found in the environment
        if (error.message?.includes('Bucket not found') || (error as any).status === '404' || (error as any).status === 404) {
            const fallbackResult = await supabase.storage
                .from('finance_attachments')
                .upload(filePath, decode(base64Data), {
                    contentType,
                    upsert: false
                });
            if (fallbackResult.error) throw fallbackResult.error;
            return filePath;
        }
        throw error;
    }
    return filePath;
}

export async function resolveFinanceUrl(path: string): Promise<string> {
    if (!path) return '';

    // If it is already a full URL, return it directly. Skip splitting/resigning.
    if (path.startsWith('http')) {
        return path;
    }

    const cleanPath = path;
    try {
        // Run both buckets in parallel with a 5-second timeout to prevent UI freezes
        const timeout = new Promise<{data: any}>((resolve) => setTimeout(() => resolve({ data: null }), 5000));
        const [res1, res2] = await Promise.all([
            Promise.race([
                supabase.storage.from('finance_attachments').createSignedUrl(cleanPath, 3600).catch(() => ({ data: null })),
                timeout
            ]),
            Promise.race([
                supabase.storage.from('finance-documents').createSignedUrl(cleanPath, 3600).catch(() => ({ data: null })),
                timeout
            ])
        ]);
        if (res1?.data?.signedUrl) return res1.data.signedUrl;
        if (res2?.data?.signedUrl) return res2.data.signedUrl;
    } catch (e) {
        console.log("Error resolving finance storage URL in parallel:", e);
    }

    // A failed storage lookup must not become a fabricated, apparently available file URL.
    return '';
}


export async function fetchBeneficiaryAccounts() {
    // 1. Fetch from dedicated beneficiary table
    const { data: savedData, error: savedError } = await supabase
        .from('finance_beneficiary_accounts')
        .select('*')
        .order('account_name', { ascending: true });
    if (savedError) console.error("Error fetching beneficiary accounts:", savedError);

    // 2. Extract unique bank accounts from existing purchasing requests
    const { data: purchaseData } = await supabase
        .from('purchasing_requests')
        .select('beneficiary_bank, beneficiary_number, beneficiary_name')
        .not('beneficiary_bank', 'is', null)
        .not('beneficiary_number', 'is', null);

    // 3. Extract unique bank accounts from existing reimbursement requests
    const { data: reimburseData } = await supabase
        .from('reimbursement_requests')
        .select('beneficiary_bank, beneficiary_number, beneficiary_name')
        .not('beneficiary_bank', 'is', null)
        .not('beneficiary_number', 'is', null);

    // Merge and deduplicate by bank + account number
    const accountMap = new Map<string, { id?: string; bank_name: string; account_number: string; account_name: string; vendor_name?: string }>();

    (purchaseData || []).forEach((r: any) => {
        if (r.beneficiary_number && r.beneficiary_bank) {
            const key = `${r.beneficiary_bank}-${r.beneficiary_number}`.toLowerCase();
            if (!accountMap.has(key)) {
                accountMap.set(key, {
                    bank_name: r.beneficiary_bank,
                    account_number: r.beneficiary_number,
                    account_name: r.beneficiary_name || ''
                });
            }
        }
    });

    (reimburseData || []).forEach((r: any) => {
        if (r.beneficiary_number && r.beneficiary_bank) {
            const key = `${r.beneficiary_bank}-${r.beneficiary_number}`.toLowerCase();
            if (!accountMap.has(key)) {
                accountMap.set(key, {
                    bank_name: r.beneficiary_bank,
                    account_number: r.beneficiary_number,
                    account_name: r.beneficiary_name || ''
                });
            }
        }
    });

    // Dedicated table takes priority
    (savedData || []).forEach((acc: any) => {
        const key = `${acc.bank_name}-${acc.account_number}`.toLowerCase();
        accountMap.set(key, {
            id: acc.id,
            bank_name: acc.bank_name,
            account_number: acc.account_number,
            account_name: acc.account_name,
            vendor_name: acc.vendor_name || undefined,
        });
    });

    return Array.from(accountMap.values()).sort((a, b) => a.account_name.localeCompare(b.account_name));
}

export async function saveBeneficiaryAccount(account: { bank_name: string; account_number: string; account_name: string; vendor_name?: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || (await supabase.auth.getSession()).data.session?.user?.id;
    if (!userId) throw new Error("User not authenticated");

    const normalized = {
        ...account,
        bank_name: account.bank_name.trim(),
        account_number: account.account_number.trim(),
        account_name: account.account_name.trim(),
    };
    const { data: existing, error: lookupError } = await supabase
        .from('finance_beneficiary_accounts')
        .select('id')
        .ilike('bank_name', normalized.bank_name)
        .eq('account_number', normalized.account_number)
        .maybeSingle();
    if (lookupError) throw lookupError;

    const query = existing?.id
        ? supabase.from('finance_beneficiary_accounts').update({
            account_name: normalized.account_name,
            vendor_name: normalized.vendor_name,
            is_global: true,
        }).eq('id', existing.id)
        : supabase.from('finance_beneficiary_accounts').insert([{
            ...normalized,
            created_by: userId,
            is_global: true,
        }]);
    const { data, error } = await query.select();
    if (error) {
        console.error("Error saving beneficiary account:", error);
        throw error;
    }
    return data;
}
