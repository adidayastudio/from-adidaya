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
import { getFinanceDocumentRules, saveFinanceDocumentRules, FinanceDocumentRulesSettings, DEFAULT_FINANCE_DOCUMENT_RULES, getFinanceApprovalMatrixSettings } from '../lib/api/financeSetup';

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
        fetchGeneration.current++; setMePurchasing([]); setMeReimbursement([]); setTeamPurchasing([]); setTeamReimbursement([]); setConsolidations([]); setFundingSources([]); setPettyCashPools([]); setHasCloudConsolidation(false);
        return () => { fetchGeneration.current++; };
    }, [user?.id]);
    const refreshData = useCallback(async () => {
        const run = ++fetchGeneration.current;
        if (!user) { setIsLoading(false); return; }
        setIsLoading(true);
        try {
            const results = await Promise.allSettled([
                fetchPurchasingRequests(user.id, false, orgPrefix),
                canAccessFinanceTeam(profile?.role) ? fetchPurchasingRequests(user.id, true, orgPrefix) : Promise.resolve([]),
                fetchReimburseRequests(user.id, false, orgPrefix),
                canAccessFinanceTeam(profile?.role) ? fetchReimburseRequests(user.id, true, orgPrefix) : Promise.resolve([]),
                fetchFundingSources(),
                fetchPettyCashPools(),
                canAccessFinanceTeam(profile?.role) ? fetchPurchasingConsolidations(user.id, true) : Promise.resolve([]),
                getFinanceDocumentRules(activeTenant?.id),
                getFinanceApprovalMatrixSettings(),
                supabase.from('purchasing_consolidations').select('id').limit(0),
            ]);

            if (run !== fetchGeneration.current) return;
            const cloudReady = results[9].status === 'fulfilled' && !results[9].value.error;
            setHasCloudConsolidation(cloudReady);
            const myPurchases = results[0].status === 'fulfilled' ? results[0].value : [];
            const teamPurchases = results[1].status === 'fulfilled' ? results[1].value : [];
            const myReimburse = results[2].status === 'fulfilled' ? results[2].value : [];
            const teamReimburse = results[3].status === 'fulfilled' ? results[3].value : [];
            const sources = results[4].status === 'fulfilled' ? results[4].value : [];
            const pools = results[5].status === 'fulfilled' ? results[5].value : [];
            const fetchedConsolidations = results[6].status === 'fulfilled' ? results[6].value : [];
            const docRules = results[7].status === 'fulfilled' ? results[7].value : null;
            const approvalMatrix = results[8].status === 'fulfilled' ? results[8].value : null;

            // Check if current user is listed in any approval matrix chain
            let foundInMatrix = false;
            if (approvalMatrix && user) {
                const userFullName = (profile?.full_name || '').toLowerCase().trim();
                const userNickname = (profile?.nickname || '').toLowerCase().trim();
                const userEmail = (user.email || '').toLowerCase().trim();
                const userRole = (profile?.role || '').toLowerCase().trim();

                const isLevelMatching = (level: any) => {
                    if (!level) return false;
                    if (level.userId && level.userId === user.id) return true;
                    if (level.personName) {
                        const pName = String(level.personName).toLowerCase().trim();
                        if (userFullName && pName === userFullName) return true;
                        if (userNickname && pName === userNickname) return true;
                        if (userEmail && pName === userEmail) return true;
                    }
                    if (level.positionTitle) {
                        const posTitle = String(level.positionTitle).toLowerCase().trim();
                        if (userRole && posTitle === userRole) return true;
                        if ((userRole === 'admin' || userRole === 'administrator') && (posTitle === 'administrator' || posTitle === 'admin')) return true;
                    }
                    return false;
                };

                for (const config of Object.values(approvalMatrix)) {
                    if (config.globalChain?.some(isLevelMatching)) {
                        foundInMatrix = true;
                        break;
                    }
                    if (config.departmentGroups?.some((group: any) => group.chain?.some(isLevelMatching))) {
                        foundInMatrix = true;
                        break;
                    }
                }
            }
            setIsFinanceApprover(canAccessFinanceTeam(profile?.role));

            if (results[0].status === 'fulfilled') setMePurchasing(myPurchases);
            if (results[1].status === 'fulfilled') setTeamPurchasing(teamPurchases);
            if (results[2].status === 'fulfilled') setMeReimbursement(myReimburse);
            if (results[3].status === 'fulfilled') setTeamReimbursement(teamReimburse);
            if (results[4].status === 'fulfilled') setFundingSources(sources);
            if (results[5].status === 'fulfilled') setPettyCashPools(pools);
            setConsolidations(cloudReady ? fetchedConsolidations : []);
            if (docRules) setDocumentRules(docRules);
        } catch (error) {
            console.error("Failed to load finance data:", error);
        } finally {
            if (run === fetchGeneration.current) setIsLoading(false);
        }
    }, [user, profile, orgPrefix, activeTenant?.id]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const addPurchasingRequest = async (payload: PurchasingRequest) => {
        if (!user) return null;
        const res = await createPurchasingRequest(user.id, payload);
        await refreshData();
        return res;
    };

    const addReimburseRequest = async (payload: ReimburseRequest) => {
        if (!user) return null;
        const res = await createReimburseRequest(user.id, payload);
        await refreshData();
        return res;
    };

    const topUpPettyCash = async (poolId: string, amount: number, description: string) => {
        if (!user) return;
        await topUpPettyCashApi(poolId, amount, description, user.id);
        await refreshData();
    };

    const updateRequestStatus = async (id: string, type: 'purchasing' | 'reimbursement', status: string, statusTag: string, extraUpdates: any = {}) => {
        let reqNumber = id;
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

            await updatePurchasingStatus(id, {
                approval_status,
                financial_status,
                ...extraUpdates,
            });
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

            await updateReimburseStatus(id, { status: dbStatus, ...extraUpdates });
        }

        // Automatic Lifecycle Synchronization
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

        await refreshData();
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
        
        // If resubmitted (not draft), auto-complete linked revision task
        if (!payload.isDraft) {
            try {
                const { syncFinanceTaskOnResubmit } = await import('@/lib/workflows/taskActionDispatcher');
                const reqNum = (payload as any).request_number || id;
                await syncFinanceTaskOnResubmit(reqNum);
            } catch (err) {
                console.warn('Sync error on purchasing resubmit:', err);
            }
        }

        await refreshData();
        return res;
    };

    const updateReimburseRequest = async (id: string, payload: ReimburseRequest & { details?: any; statusTag?: string; isDraft?: boolean }) => {
        if (!user) return null;
        const res = await updateReimburseRequestApi(user.id, id, payload);
        
        // If resubmitted (not draft), auto-complete linked revision task
        if (!payload.isDraft) {
            try {
                const { syncFinanceTaskOnResubmit } = await import('@/lib/workflows/taskActionDispatcher');
                const reqNum = (payload as any).request_number || id;
                await syncFinanceTaskOnResubmit(reqNum);
            } catch (err) {
                console.warn('Sync error on reimbursement resubmit:', err);
            }
        }

        await refreshData();
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
