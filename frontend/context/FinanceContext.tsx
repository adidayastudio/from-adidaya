import { supabase } from '../lib/supabase';
import { canAccessFinanceTeam } from '@/lib/auth-utils';
import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useUserContext, MANAGEMENT_ROLES } from './UserProvider';
import { useTenantContext } from './TenantContext';
import { 
    fetchPurchasingRequests, 
    fetchReimburseRequests, 
    fetchFundingSources, 
    fetchPettyCashPools,
    createPurchasingRequest,
    createReimburseRequest,
    topUpPettyCashApi,
    updatePurchasingStatus,
    updateReimburseStatus,
    deletePurchasingRequest,
    deleteReimburseRequest,
    updatePurchasingRequest as updatePurchasingRequestApi,
    updateReimburseRequest as updateReimburseRequestApi,
    payFinanceRequest,
    PurchasingRequest,
    ReimburseRequest
} from '../lib/api/finance';
import {
    fetchPurchasingConsolidations,
    createPurchasingConsolidation,
    addRequestsToDraftConsolidation,
    removeRequestFromDraftConsolidation,
    updateConsolidationRequestOverride,
    cancelPurchasingConsolidation,
    deletePurchasingConsolidation,
    cancelPurchasingConsolidationSubmission,
    cancelPurchasingConsolidationApproval,
    submitPurchasingConsolidation,
    approvePurchasingConsolidation,
    rejectPurchasingConsolidation,
    revisePurchasingConsolidation,
    payConsolidationRequestsBatch,
    PurchasingConsolidationItem,
    PaymentBatchPayload,
} from '../lib/api/financeConsolidation';
import { getFinanceDocumentRules, saveFinanceDocumentRules, FinanceDocumentRulesSettings, DEFAULT_FINANCE_DOCUMENT_RULES } from '../lib/api/financeSetup';

export type Scope = 'me' | 'team';
export type PurchasingWorkflowSubtab = 'request' | 'consolidation' | 'payment';

export interface FinanceContextType {
    activeScope: Scope;
    setActiveScope: (scope: Scope) => void;
    activeWorkflowTab: PurchasingWorkflowSubtab;
    setActiveWorkflowTab: (tab: PurchasingWorkflowSubtab) => void;
    purchasingRequests: any[];
    reimbursementRequests: any[];
    teamPurchasing: any[];
    teamReimbursement: any[];
    consolidations: PurchasingConsolidationItem[];
    fundingSources: any[];
    pettyCashPools: any[];
    documentRules: FinanceDocumentRulesSettings;
    isConsolidationEnabled: boolean;
    isPurchasingConsolidationEnabled: boolean;
    isReimbursementConsolidationEnabled: boolean;
    updateDocumentRules: (rules: FinanceDocumentRulesSettings) => Promise<void>;
    isFinanceApprover: boolean;
    hasTeamAccess: boolean;
    isLoading: boolean;
    historyReady: boolean;
    loadError: string | null;
    hasFinanceData: boolean;
    refreshData: () => Promise<void>;
    addPurchasingRequest: (payload: PurchasingRequest) => Promise<any>;
    addReimburseRequest: (payload: ReimburseRequest) => Promise<any>;
    topUpPettyCash: (poolId: string, amount: number, description: string) => Promise<void>;
    updateRequestStatus: (id: string, type: 'purchasing' | 'reimbursement', status: string, statusTag: string, extraUpdates?: any) => Promise<void>;
    deleteRequest: (id: string, type: 'purchasing' | 'reimbursement') => Promise<void>;
    updatePurchasingRequest: (id: string, payload: PurchasingRequest & { category?: string; vendor_name?: string; status?: string; statusTag?: string; isDraft?: boolean }) => Promise<any>;
    updateReimburseRequest: (id: string, payload: ReimburseRequest & { details?: any; statusTag?: string; isDraft?: boolean }) => Promise<any>;
    payRequest: (id: string, type: 'purchasing' | 'reimbursement', payload: { source_of_fund_id: string; payment_date: string; payment_proof_url?: string; amount: number; ref?: string }) => Promise<void>;
    // Consolidation methods
    createConsolidation: (requestIds: string[]) => Promise<PurchasingConsolidationItem>;
    addRequestsToConsolidation: (consolidationId: string, requestIds: string[]) => Promise<void>;
    removeRequestFromConsolidation: (consolidationId: string, requestId: string) => Promise<void>;
    updateConsolidationRequest: (consolidationId: string, requestId: string, values: any) => Promise<void>;
    cancelConsolidation: (consolidationId: string) => Promise<void>;
    deleteConsolidation: (consolidationId: string) => Promise<void>;
    submitConsolidation: (consolidationId: string) => Promise<void>;
    cancelConsolidationSubmission: (consolidationId: string) => Promise<void>;
    cancelConsolidationApproval: (consolidationId: string) => Promise<void>;
    approveConsolidation: (consolidationId: string, levelIndex?: number, totalLevels?: number, approvedAmount?: number, approvalNote?: string) => Promise<void>;
    rejectConsolidation: (consolidationId: string, reason: string) => Promise<void>;
    reviseConsolidation: (consolidationId: string, reason: string) => Promise<void>;
    payConsolidationBatch: (consolidationId: string, requestIds: string[], payload: PaymentBatchPayload) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, profile } = useUserContext();
    const { activeTenant } = useTenantContext();
    const isManager = canAccessFinanceTeam(profile?.role);
    const [isFinanceApprover, setIsFinanceApprover] = useState(false);
    const hasTeamAccess = isManager;
    const [activeScope, setActiveScope] = useState<Scope>('me');
    const [activeWorkflowTab, setActiveWorkflowTab] = useState<PurchasingWorkflowSubtab>('request');

    useEffect(() => {
        if (profile) {
            if (!hasTeamAccess) {
                setActiveScope('me');
            } else {
                setActiveScope('team');
            }
        }
    }, [profile, hasTeamAccess]);

    const [mePurchasing, setMePurchasing] = useState<any[]>([]);
    const [meReimbursement, setMeReimbursement] = useState<any[]>([]);
    const [teamPurchasing, setTeamPurchasing] = useState<any[]>([]);
    const [teamReimbursement, setTeamReimbursement] = useState<any[]>([]);
    const [consolidations, setConsolidations] = useState<PurchasingConsolidationItem[]>([]);
    const [pettyCashPools, setPettyCashPools] = useState<any[]>([]);
    const [fundingSources, setFundingSources] = useState<any[]>([]);
    const [documentRules, setDocumentRules] = useState<FinanceDocumentRulesSettings>(DEFAULT_FINANCE_DOCUMENT_RULES);
    const [isLoading, setIsLoading] = useState(false);
    const [historyReady, setHistoryReady] = useState(false);
    const historyReadyRef = useRef(false);
    const [hasFinanceData, setHasFinanceData] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        getFinanceDocumentRules(activeTenant?.id).then((rules) => {
            if (isMounted && rules) {
                setDocumentRules(rules);
            }
        }).catch(() => {});
        return () => { isMounted = false; };
    }, [activeTenant?.id]);

    const [hasCloudConsolidation, setHasCloudConsolidation] = useState(false);
    const isPurchasingConsolidationEnabled = useMemo(() => {
        return hasCloudConsolidation && Boolean(documentRules.purchasing?.levels?.consolidation?.enabled);
    }, [documentRules, hasCloudConsolidation]);

    const isReimbursementConsolidationEnabled = useMemo(() => {
        return hasCloudConsolidation && Boolean(documentRules.reimbursement?.levels?.consolidation?.enabled);
    }, [documentRules, hasCloudConsolidation]);

    const isConsolidationEnabled = isPurchasingConsolidationEnabled;

    const updateDocumentRules = useCallback(async (rules: FinanceDocumentRulesSettings) => {
        setDocumentRules(rules);
        await saveFinanceDocumentRules(rules, activeTenant?.id);
    }, [activeTenant?.id]);

    const purchasingRequests = useMemo(() => activeScope === 'me' ? mePurchasing : teamPurchasing, [activeScope, mePurchasing, teamPurchasing]);
    const reimbursementRequests = useMemo(() => activeScope === 'me' ? meReimbursement : teamReimbursement, [activeScope, meReimbursement, teamReimbursement]);

    const orgPrefix = useMemo(() => {
        const raw = activeTenant?.company_code || 'ADY';
        return raw.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'ADY';
    }, [activeTenant?.company_code]);

    const fetchGeneration = useRef(0);
    useEffect(() => {
        fetchGeneration.current++; historyReadyRef.current = false; setHistoryReady(false); setHasFinanceData(false); setLoadError(null); setMePurchasing([]); setMeReimbursement([]); setTeamPurchasing([]); setTeamReimbursement([]); setConsolidations([]); setFundingSources([]); setPettyCashPools([]); setHasCloudConsolidation(false);
        return () => { fetchGeneration.current++; };
    }, [user?.id]);
    const refreshData = useCallback(async (background = false) => {
        const run = ++fetchGeneration.current;
        if (!user) { setIsLoading(false); return; }
        setIsLoading(true);
        setLoadError(null);
        const team = canAccessFinanceTeam(profile?.role);
        setIsFinanceApprover(team);
        const isCurrent = () => run === fetchGeneration.current;
        const withTimeout = async <T,>(operation: PromiseLike<T>, timeout = 20000): Promise<T> => {
            let timer: ReturnType<typeof setTimeout> | undefined;
            try {
                return await Promise.race([operation, new Promise<never>((_, reject) => {
                    timer = setTimeout(() => reject(new Error('Finance data took too long to load. Check your connection and retry.')), timeout);
                })]);
            } finally {
                if (timer) clearTimeout(timer);
            }
        };
        const fetchRequests = (fromDate?: string) => withTimeout(Promise.all([
            fetchPurchasingRequests(user.id, team, orgPrefix, undefined, fromDate),
            fetchReimburseRequests(user.id, team, orgPrefix, undefined, fromDate),
        ]), fromDate ? 6000 : 20000);
        const publishRequests = ([purchases, reimbursements]: Awaited<ReturnType<typeof fetchRequests>>) => {
            if (!isCurrent()) return;
            setTeamPurchasing(team ? purchases : []);
            setTeamReimbursement(team ? reimbursements : []);
            setMePurchasing(team ? purchases.filter(item => item.created_by === user.id) : purchases);
            setMeReimbursement(team ? reimbursements.filter(item => item.user_id === user.id) : reimbursements);
            setHasFinanceData(true);
        };
        const reportError = (error: unknown, fallback: string) => {
            console.error(fallback, error);
            const detail = error && typeof error === 'object' && 'message' in error
                ? String(error.message) : '';
            const message = /failed to fetch|network request failed|load failed|networkerror/i.test(detail)
                ? 'Could not reach Finance. Check your connection and retry.'
                : error instanceof Error ? error.message : fallback;
            if (isCurrent()) setLoadError(previous => previous || message);
        };

        const auxiliary = Promise.allSettled([
            withTimeout(fetchFundingSources()).then(rows => { if (isCurrent()) setFundingSources(rows); }),
            withTimeout(fetchPettyCashPools()).then(rows => { if (isCurrent()) setPettyCashPools(rows); }),
            withTimeout(getFinanceDocumentRules(activeTenant?.id)).then(rules => { if (isCurrent()) setDocumentRules(rules); }),
        ]);
        try {
            if (!background && !historyReadyRef.current) {
                const now = new Date();
                const fromDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                try {
                    publishRequests(await fetchRequests(fromDate));
                } catch (error) {
                    if (isCurrent()) console.warn('Unable to load recent Finance requests:', error);
                }
            }
            if (!isCurrent()) return;
            const requests = await fetchRequests();
            publishRequests(requests);
            if (!isCurrent()) return;
            historyReadyRef.current = true;
            setHistoryReady(true);

            if (team) {
                const cloud = await withTimeout(supabase.from('purchasing_consolidations').select('id').limit(0));
                if (isCurrent()) setHasCloudConsolidation(!cloud.error);
                if (!cloud.error && isCurrent()) {
                    const rows = await withTimeout(fetchPurchasingConsolidations(user.id, true, requests[0]));
                    if (isCurrent()) setConsolidations(rows);
                }
            }
        } catch (error) {
            reportError(error, 'Could not load Finance data. Please retry.');
        } finally {
            const results = await auxiliary;
            if (results.some(result => result.status === 'rejected')) {
                reportError(results.find(result => result.status === 'rejected')?.reason, 'Some Finance data could not load. Please retry.');
            }
            if (isCurrent()) setIsLoading(false);
        }
    }, [user, profile, orgPrefix, activeTenant?.id]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const addPurchasingRequest = async (payload: PurchasingRequest) => {
        if (!user) return null;
        const res = await createPurchasingRequest(user.id, payload);
        void refreshData(true);
        return res;
    };

    const addReimburseRequest = async (payload: ReimburseRequest) => {
        if (!user) return null;
        const res = await createReimburseRequest(user.id, payload);
        void refreshData(true);
        return res;
    };

    const topUpPettyCash = async (poolId: string, amount: number, description: string) => {
        if (!user) return;
        await topUpPettyCashApi(poolId, amount, description, user.id);
        await refreshData();
    };

    const updateRequestStatus = async (id: string, type: 'purchasing' | 'reimbursement', status: string, statusTag: string, extraUpdates: any = {}) => {
        let reqNumber = id;
        let confirmedUpdates: Record<string, any> = {};
        if (type === 'purchasing') {
            const req = purchasingRequests.find(r => r.id === id);
            if (req?.request_number) reqNumber = req.request_number;

            let approval_status: string;
            let financial_status = extraUpdates.financial_status ?? 'UNPAID';

            switch (statusTag) {
                case 'draft':
                    approval_status = 'DRAFT';
                    break;
                case 'pending':
                    approval_status = 'SUBMITTED';
                    break;
                case 'approved':
                    approval_status = 'APPROVED';
                    break;
                case 'rejected':
                    approval_status = 'REJECTED';
                    break;
                case 'revision':
                    approval_status = 'NEED_REVISION';
                    break;
                case 'paid':
                    approval_status = 'APPROVED';
                    financial_status = 'PAID';
                    break;
                default:
                    approval_status = status.toUpperCase();
            }

            confirmedUpdates = { approval_status, financial_status, ...extraUpdates };
            await updatePurchasingStatus(id, confirmedUpdates);
        } else {
            const req = reimbursementRequests.find(r => r.id === id);
            if (req?.request_number) reqNumber = req.request_number;

            let dbStatus: string;
            switch (statusTag) {
                case 'draft':
                    dbStatus = 'DRAFT';
                    break;
                case 'pending':
                    dbStatus = 'PENDING';
                    break;
                case 'approved':
                    dbStatus = 'APPROVED';
                    break;
                case 'rejected':
                    dbStatus = 'REJECTED';
                    break;
                case 'revision':
                    dbStatus = 'NEED_REVISION';
                    break;
                case 'paid':
                    dbStatus = 'PAID';
                    break;
                default:
                    dbStatus = statusTag.toUpperCase();
            }

            confirmedUpdates = { status: dbStatus, ...extraUpdates };
            await updateReimburseStatus(id, confirmedUpdates);
        }

        const apply = (rows: any[]) => rows.map(row => row.id === id ? { ...row, ...confirmedUpdates, status, statusTag } : row);
        if (type === 'purchasing') { setMePurchasing(apply); setTeamPurchasing(apply); }
        else { setMeReimbursement(apply); setTeamReimbursement(apply); }
        void refreshData(true);
        // Task synchronization is a side effect, not part of confirming the saved status.
        void (async () => {
            try {
                const { syncFinanceActionOnDecision, syncFinanceTaskOnResubmit } = await import('@/lib/workflows/taskActionDispatcher');
                if (statusTag === 'approved') {
                    await syncFinanceActionOnDecision(reqNumber, 'approved');
                } else if (statusTag === 'revision') {
                    await syncFinanceActionOnDecision(reqNumber, 'revision', extraUpdates.revision_reason);
                } else if (statusTag === 'rejected') {
                    await syncFinanceActionOnDecision(reqNumber, 'rejected', extraUpdates.rejection_reason);
                } else if (statusTag === 'pending') {
                    // When resubmitted in Finance, auto-complete linked Revision Task
                    await syncFinanceTaskOnResubmit(reqNumber);
                }
            } catch (syncErr) {
                console.warn('Sync error on finance status update:', syncErr);
            }

        })();
    };

    const deleteRequest = async (id: string, type: 'purchasing' | 'reimbursement') => {
        if (type === 'purchasing') {
            await deletePurchasingRequest(id);
        } else {
            await deleteReimburseRequest(id);
        }
        await refreshData();
    };

    const updatePurchasingRequest = async (id: string, payload: PurchasingRequest & { category?: string; vendor_name?: string; status?: string; statusTag?: string; isDraft?: boolean }) => {
        if (!user) return null;
        const res = await updatePurchasingRequestApi(user.id, id, payload);
        
        void refreshData(true);
        // Keep task synchronization out of the request save confirmation.
        void (async () => {
            if (!payload.isDraft && !(payload as any).adminEdit) {
                try {
                    const { syncFinanceTaskOnResubmit } = await import('@/lib/workflows/taskActionDispatcher');
                    const reqNum = (payload as any).request_number || id;
                    await syncFinanceTaskOnResubmit(reqNum);
                } catch (err) {
                    console.warn('Sync error on purchasing resubmit:', err);
                }
            }

        })();
        return res;
    };

    const updateReimburseRequest = async (id: string, payload: ReimburseRequest & { details?: any; statusTag?: string; isDraft?: boolean }) => {
        if (!user) return null;
        const res = await updateReimburseRequestApi(user.id, id, payload);
        
        void refreshData(true);
        // Keep task synchronization out of the request save confirmation.
        void (async () => {
            if (!payload.isDraft && !(payload as any).adminEdit) {
                try {
                    const { syncFinanceTaskOnResubmit } = await import('@/lib/workflows/taskActionDispatcher');
                    const reqNum = (payload as any).request_number || id;
                    await syncFinanceTaskOnResubmit(reqNum);
                } catch (err) {
                    console.warn('Sync error on reimbursement resubmit:', err);
                }
            }

        })();
        return res;
    };

    const payRequest = async (
        id: string,
        type: 'purchasing' | 'reimbursement',
        payload: { source_of_fund_id: string; payment_date: string; payment_proof_url?: string; amount: number; ref?: string }
    ) => {
        if (!user) return;
        await payFinanceRequest(user.id, id, type, payload);
        await refreshData();
    };

    // Consolidation Operations
    const createConsolidation = async (requestIds: string[]) => {
        if (!hasCloudConsolidation || !hasTeamAccess) throw new Error('Consolidation is not available for this account or database.');
        if (!user) throw new Error('User not authenticated');
        const res = await createPurchasingConsolidation(user.id, requestIds, profile?.full_name || 'Authorized Officer');
        await refreshData();
        return res;
    };

    const addRequestsToConsolidation = async (consolidationId: string, requestIds: string[]) => {
        if (!hasCloudConsolidation || !hasTeamAccess) throw new Error('Consolidation is not available for this account or database.');
        if (!user) return;
        await addRequestsToDraftConsolidation(consolidationId, requestIds, user.id, profile?.full_name || 'Authorized Officer');
        await refreshData();
    };

    const removeRequestFromConsolidation = async (consolidationId: string, requestId: string) => {
        if (!hasCloudConsolidation || !hasTeamAccess) throw new Error('Consolidation is not available for this account or database.');
        if (!user) return;
        await removeRequestFromDraftConsolidation(consolidationId, requestId, user.id, profile?.full_name || 'Authorized Officer');
        await refreshData();
    };

    const updateConsolidationRequest = async (consolidationId: string, requestId: string, values: any) => {
        if (!hasCloudConsolidation || !hasTeamAccess) throw new Error('Consolidation is not available for this account or database.');
        if (!user) return;
        await updateConsolidationRequestOverride(consolidationId, requestId, values, user.id, profile?.full_name || 'Authorized Officer');
        await refreshData();
    };

    const cancelConsolidation = async (consolidationId: string) => {
        if (!hasCloudConsolidation || !hasTeamAccess) throw new Error('Consolidation is not available for this account or database.');
        if (!user) return;
        await cancelPurchasingConsolidation(consolidationId, user.id, profile?.full_name || 'Authorized Officer');
        await refreshData();
    };

    const deleteConsolidation = async (consolidationId: string) => {
        if (!hasCloudConsolidation || !hasTeamAccess) throw new Error('Consolidation is not available for this account or database.');
        if (!user) return;
        await deletePurchasingConsolidation(consolidationId, user.id, profile?.full_name || 'Authorized Officer');
        await refreshData();
    };

    const submitConsolidation = async (consolidationId: string) => {
        if (!hasCloudConsolidation || !hasTeamAccess) throw new Error('Consolidation is not available for this account or database.');
        if (!user) return;
        await submitPurchasingConsolidation(consolidationId, user.id, profile?.full_name || 'Authorized Officer');
        await refreshData();
    };

    const cancelConsolidationSubmission = async (consolidationId: string) => {
        if (!hasCloudConsolidation || !hasTeamAccess) throw new Error('Consolidation is not available for this account or database.');
        if (!user) return;
        await cancelPurchasingConsolidationSubmission(consolidationId, user.id, profile?.full_name || 'Authorized Officer');
        await refreshData();
    };

    const cancelConsolidationApproval = async (consolidationId: string) => {
        if (!hasCloudConsolidation || !hasTeamAccess) throw new Error('Consolidation is not available for this account or database.');
        if (!user) return;
        await cancelPurchasingConsolidationApproval(consolidationId, user.id, profile?.full_name || 'Approver');
        await refreshData();
    };

    const approveConsolidation = async (consolidationId: string, levelIndex = 0, totalLevels = 1, approvedAmount?: number, approvalNote?: string) => {
        if (!hasCloudConsolidation || !hasTeamAccess) throw new Error('Consolidation is not available for this account or database.');
        if (!user) return;
        await approvePurchasingConsolidation(consolidationId, user.id, profile?.full_name || 'Approver', levelIndex, totalLevels, approvedAmount, approvalNote);
        await refreshData();
    };

    const rejectConsolidation = async (consolidationId: string, reason: string) => {
        if (!hasCloudConsolidation || !hasTeamAccess) throw new Error('Consolidation is not available for this account or database.');
        if (!user) return;
        await rejectPurchasingConsolidation(consolidationId, reason, user.id, profile?.full_name || 'Approver');
        await refreshData();
    };

    const reviseConsolidation = async (consolidationId: string, reason: string) => {
        if (!hasCloudConsolidation || !hasTeamAccess) throw new Error('Consolidation is not available for this account or database.');
        if (!user) return;
        await revisePurchasingConsolidation(consolidationId, reason, user.id, profile?.full_name || 'Approver');
        await refreshData();
    };

    const payConsolidationBatch = async (consolidationId: string, requestIds: string[], payload: PaymentBatchPayload) => {
        if (!hasCloudConsolidation || !hasTeamAccess) throw new Error('Consolidation is not available for this account or database.');
        if (!user) return;
        await payConsolidationRequestsBatch(user.id, consolidationId, requestIds, payload, profile?.full_name || 'Payer');
        await refreshData();
    };

    return (
        <FinanceContext.Provider value={{
            activeScope,
            setActiveScope,
            activeWorkflowTab,
            setActiveWorkflowTab,
            purchasingRequests,
            reimbursementRequests,
            teamPurchasing,
            teamReimbursement,
            consolidations,
            fundingSources,
            pettyCashPools,
            documentRules,
            isConsolidationEnabled,
            isPurchasingConsolidationEnabled,
            isReimbursementConsolidationEnabled,
            updateDocumentRules,
            isFinanceApprover,
            hasTeamAccess,
            isLoading,
            historyReady,
            hasFinanceData,
            loadError,
            refreshData,
            addPurchasingRequest,
            addReimburseRequest,
            topUpPettyCash,
            updateRequestStatus,
            deleteRequest,
            updatePurchasingRequest,
            updateReimburseRequest,
            payRequest,
            createConsolidation,
            addRequestsToConsolidation,
            removeRequestFromConsolidation,
            updateConsolidationRequest,
            cancelConsolidation,
            deleteConsolidation,
            submitConsolidation,
            cancelConsolidationSubmission,
            cancelConsolidationApproval,
            approveConsolidation,
            rejectConsolidation,
            reviseConsolidation,
            payConsolidationBatch,
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

const DEFAULT_FINANCE_CONTEXT: FinanceContextType = {
    activeScope: 'me',
    setActiveScope: () => {},
    activeWorkflowTab: 'request',
    setActiveWorkflowTab: () => {},
    purchasingRequests: [],
    reimbursementRequests: [],
    teamPurchasing: [],
    teamReimbursement: [],
    consolidations: [],
    fundingSources: [],
    pettyCashPools: [],
    documentRules: DEFAULT_FINANCE_DOCUMENT_RULES,
    isConsolidationEnabled: false,
    isPurchasingConsolidationEnabled: false,
    isReimbursementConsolidationEnabled: false,
    updateDocumentRules: async () => {},
    isFinanceApprover: false,
    hasTeamAccess: false,
    isLoading: false,
    historyReady: false,
    hasFinanceData: false,
    loadError: null,
    refreshData: async () => {},
    addPurchasingRequest: async () => null,
    addReimburseRequest: async () => null,
    topUpPettyCash: async () => {},
    updateRequestStatus: async () => {},
    deleteRequest: async () => {},
    updatePurchasingRequest: async () => null,
    updateReimburseRequest: async () => null,
    payRequest: async () => {},
    createConsolidation: async () => ({} as any),
    addRequestsToConsolidation: async () => {},
    removeRequestFromConsolidation: async () => {},
    updateConsolidationRequest: async () => {},
    cancelConsolidation: async () => {},
    deleteConsolidation: async () => {},
    submitConsolidation: async () => {},
    cancelConsolidationSubmission: async () => {},
    cancelConsolidationApproval: async () => {},
    approveConsolidation: async () => {},
    rejectConsolidation: async () => {},
    reviseConsolidation: async () => {},
    payConsolidationBatch: async () => {},
};

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (!context) {
        return DEFAULT_FINANCE_CONTEXT;
    }
    return context;
};
