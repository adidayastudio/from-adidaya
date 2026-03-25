"use client";

import { useState, useEffect, useMemo } from "react";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import { useFinance } from "./FinanceContext";
import { FinanceSummaryCard, FinanceSummaryCardsRow } from "./FinanceSummaryCard";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import {
    Wallet,
    AlertCircle,
} from "lucide-react";
import { fetchProjectsByWorkspace, fetchAllProjects } from "@/lib/api/projects";
import { 
    fetchPettyCashPools, 
    upsertFundingSource, 
    recordFundingSourceTransaction, 
    fetchFundingSourceTransactions 
} from "@/lib/api/finance";
import { Project } from "@/types/project";
import { FundingSource, FundingSourceTransaction } from "@/lib/types/finance-types";

// Extracted Sub-components
import { PettyCashPoolCard } from "./petty-cash/PettyCashPoolCard";
import { AddPoolModal } from "./petty-cash/AddPoolModal";
import { TopUpModal } from "./petty-cash/TopUpModal";
import { TransactionHistoryDrawer } from "./petty-cash/TransactionHistoryDrawer";

const formatCurrency = (amount: number) => {
    return "Rp" + amount.toLocaleString("id-ID");
};

export default function PettyCashClient() {
    const { viewMode, setViewMode, canAccessTeam, isLoading: financeLoading, profile } = useFinance();
    const [projects, setProjects] = useState<Project[]>([]);
    const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
    const [isLoading, setIsLoading] = useState(false); // Start false, let useEffect trigger it
    const [drawerSourceId, setDrawerSourceId] = useState<string | null>(null);
    const [topUpSourceId, setTopUpSourceId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    const [transactions, setTransactions] = useState<FundingSourceTransaction[]>([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

    useEffect(() => {
        if (!hasLoadedOnce) {
            loadData();
        }

        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'FINANCE_TOP_UP') {
                setIsAddModalOpen(true);
            }
        };
        window.addEventListener('fab-action', handleFabAction);
        return () => window.removeEventListener('fab-action', handleFabAction);
    }, [hasLoadedOnce]);

    async function loadData() {
        setIsLoading(true);
        try {
            const allProjects = await fetchAllProjects();
            setProjects(allProjects || []);

            const workspaceId = profile?.workspace_id || allProjects[0]?.workspaceId || "f39364e8-1376-4ff7-a716-78277e8d25b3";
            console.log("[PettyCash] Loading data for workspace:", workspaceId);
            
            const pettyPools = await fetchPettyCashPools(workspaceId);
            setFundingSources(pettyPools || []);
            setHasLoadedOnce(true);
        } catch (error) {
            console.error("[PettyCash] Load error:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const pettyCashPools = useMemo(() => {
        return fundingSources.map(source => {
            const project = projects.find(p => p.id === source.project_id);
            return {
                ...source,
                projectName: project ? project.projectName : source.name,
                projectCode: project ? project.projectCode : "N/A"
            };
        });
    }, [fundingSources, projects]);

    useEffect(() => {
        if (drawerSourceId) {
            loadTransactions(drawerSourceId);
        }
    }, [drawerSourceId]);

    async function loadTransactions(sourceId: string) {
        setIsLoadingTransactions(true);
        try {
            const txs = await fetchFundingSourceTransactions(sourceId);
            setTransactions(txs);
        } catch (error) {
            console.error("Error loading transactions:", error);
        } finally {
            setIsLoadingTransactions(false);
        }
    }

    const handleCreatePool = async (projectId: string, limit: string) => {
        if (!profile?.workspace_id) return;
        setIsSubmitting(true);
        try {
            const project = projects.find(p => p.id === projectId);
            const newSource = await upsertFundingSource({
                workspace_id: profile.workspace_id,
                name: project?.projectName || "New Petty Cash",
                type: "PETTY_CASH",
                project_id: projectId,
                balance: 0,
            });
            if (newSource) {
                await loadData();
                setIsAddModalOpen(false);
            }
        } catch (error) {
            console.error("Error creating pool:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTopUp = async (amountStr: string, description: string) => {
        if (!topUpSourceId) return;
        setIsSubmitting(true);
        try {
            const amount = parseInt(amountStr.replace(/\D/g, ""));
            const success = await recordFundingSourceTransaction({
                funding_source_id: topUpSourceId,
                type: "TOP_UP",
                amount: amount,
                description: description,
                reference_type: "MANUAL",
                performed_by: profile?.id || "system"
            });
            if (success) {
                await loadData();
                setTopUpSourceId(null);
            }
        } catch (error) {
            console.error("Error topping up:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const drawerPool = fundingSources.find(s => s.id === drawerSourceId) || null;
    const topUpPool = fundingSources.find(s => s.id === topUpSourceId) || null;

    return (
        <FinancePageWrapper
            header={<FinanceHeader title="Petty Cash" subtitle="Manage cash pools for your projects." />}
        >
            {(isLoading || financeLoading) ? <GlobalLoading /> : (
                <>
                    {/* OVERVIEW STATS */}
                    <div className="-mx-5 lg:mx-0 mb-8">
                        <FinanceSummaryCardsRow>
                            <FinanceSummaryCard
                                icon={<Wallet className="w-5 h-5 text-blue-500" />}
                                iconBg="bg-blue-100 dark:bg-blue-500/10"
                                label={`Active across ${fundingSources.length} projects`}
                                value={formatCurrency(fundingSources.reduce((acc, curr) => acc + (curr.balance || 0), 0))}
                                subtext="Total Float"
                                valueColor="text-neutral-900 dark:text-white"
                            />

                            <FinanceSummaryCard
                                icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
                                iconBg="bg-amber-100 dark:bg-amber-500/10"
                                label="Needs Top Up?"
                                value={`${fundingSources.filter(p => (p.balance || 0) < 1000000).length} pools`}
                                subtext="Under limit (1M)"
                                valueColor="text-amber-600 dark:text-amber-400"
                            />
                        </FinanceSummaryCardsRow>
                    </div>

                    {/* POOLS GRID */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            Active Pools
                            <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full text-xs font-bold">{fundingSources.length}</span>
                        </h3>
                    </div>

                    {fundingSources.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md rounded-[32px] border border-neutral-100 dark:border-neutral-800 border-dashed">
                            <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
                                <Wallet size={32} />
                            </div>
                            <h4 className="text-lg font-bold text-neutral-900 dark:text-white">No Petty Cash Pools</h4>
                            <p className="text-neutral-500 text-sm mt-1 mb-6 text-center max-w-xs">Start managing project funds by creating your first petty cash pool.</p>
                            <button 
                                onClick={() => setIsAddModalOpen(true)}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
                            >
                                Create Your First Pool
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                            {pettyCashPools.map((pool) => (
                                <PettyCashPoolCard 
                                    key={pool.id}
                                    pool={pool}
                                    onCardClick={(id) => setDrawerSourceId(id)}
                                    onTopUpClick={(e, id) => { e.stopPropagation(); setTopUpSourceId(id); }}
                                />
                            ))}
                        </div>
                    )}

                    {/* MODALS & DRAWERS */}
                    <AddPoolModal 
                        isOpen={isAddModalOpen}
                        onClose={() => setIsAddModalOpen(false)}
                        projects={projects}
                        fundingSources={fundingSources}
                        isSubmitting={isSubmitting}
                        onSubmit={handleCreatePool}
                    />

                    <TopUpModal 
                        pool={topUpPool}
                        onClose={() => setTopUpSourceId(null)}
                        isSubmitting={isSubmitting}
                        onSubmit={handleTopUp}
                    />

                    <TransactionHistoryDrawer 
                        pool={drawerPool}
                        isOpen={!!drawerSourceId}
                        onClose={() => setDrawerSourceId(null)}
                        transactions={transactions}
                        isLoading={isLoadingTransactions}
                        onTopUpClick={() => { setDrawerSourceId(null); setTopUpSourceId(drawerSourceId); }}
                    />
                </>
            )}
        </FinancePageWrapper>
    );
}
