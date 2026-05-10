"use client";

import { useState, useEffect } from "react";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import {
    DollarSign,
    Receipt,
    Wallet,
    ChevronRight,
    Users,
    ShoppingCart,
    Plus,
    User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useFinance } from "./FinanceContext";
import { fetchAllProjects } from "@/lib/api/projects";
import {
    formatShort,
    formatAmount,
    getPrimaryStatus,
    formatStructuredId,
    formatItemTitle,
    formatCardDate
} from "./modules/utils";
import { FinanceSummaryCard, FinanceSummaryCardsRow } from "./FinanceSummaryCard";
import { FinancePulseBeta } from "./FinancePulseBeta";
import { FinanceItemCard } from "./FinanceItemCard";
import { NewRequestDrawer } from "./modules/NewRequestDrawer";
import { RequestType } from "./modules/RequestTypeSelector";
import { fetchFinanceDashboardData } from "@/lib/client/finance-api";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

export default function FinanceOverviewClient() {
    const { viewMode, setViewMode, canAccessTeam, isLoading: isAuthLoading, isInitialized, allowedProjectCodes } = useFinance();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedType] = useState<RequestType>("PURCHASE");
    const [data, setData] = useState<any>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'FINANCE_NEW_REQUEST') {
                setIsDrawerOpen(true);
            }
        };
        window.addEventListener('fab-action', handleFabAction);
        return () => window.removeEventListener('fab-action', handleFabAction);
    }, []);

    useEffect(() => {
        if (!isInitialized) return;

        const loadWithWorkspace = async () => {
            setIsLoadingData(true);
            try {
                const [wsId, allProjects] = await Promise.all([
                    fetchDefaultWorkspaceId(),
                    fetchAllProjects()
                ]);

                let projectIdsFilter: string | undefined = undefined;
                if (allowedProjectCodes) {
                    const filteredIds = allProjects
                        .filter(p => allowedProjectCodes.includes(p.projectCode))
                        .map(p => p.id);
                    projectIdsFilter = filteredIds.join(",");
                }

                // We need to pass the project filter to the dashboard API
                // Updating fetchFinanceDashboardData to accept it if it's not already
                const res = await fetchFinanceDashboardData(wsId || undefined, projectIdsFilter);
                setData(res);
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setIsLoadingData(false);
            }
        };
        loadWithWorkspace();
    }, [viewMode, isInitialized]);

    const isLoading = isAuthLoading || (!data && isLoadingData);

    const summary = data ? (viewMode === "team" ? data.summary.team : data.summary.personal) : null;

    return (
        <FinancePageWrapper
            header={
                <FinanceHeader 
                    title="Overview" 
                    subtitle={viewMode === 'team' ? "Team financial health and summary." : "Your personal expense and claim summary."} 
                />
            }
        >
            {isLoading ? <GlobalLoading /> : (
                <div className="space-y-6 pb-10">
                    {/* SUMMARY CARDS GRID */}
                    <FinanceSummaryCardsRow className="!mb-0">
                        {viewMode === "team" ? (
                            <>
                                <FinanceSummaryCard
                                    icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
                                    iconBg="bg-emerald-100"
                                    label="Total Paid (Month)"
                                    value="+112%"
                                    valueColor="text-red-500"
                                    subtext={formatAmount(summary.totalPaid)}
                                />
                                <FinanceSummaryCard
                                    icon={<Receipt className="w-4 h-4 text-orange-600" />}
                                    iconBg="bg-orange-100"
                                    label="Outstanding Bills"
                                    value={summary.outstanding.count}
                                    subtext={formatAmount(summary.outstanding.amount)}
                                />
                                <FinanceSummaryCard
                                    icon={<Users className="w-4 h-4 text-blue-600" />}
                                    iconBg="bg-blue-100"
                                    label="Reimburse Pending"
                                    value={summary.reimbursePending.count}
                                    subtext={formatAmount(summary.reimbursePending.amount)}
                                />
                                <FinanceSummaryCard
                                    icon={<Wallet className="w-4 h-4 text-purple-600" />}
                                    iconBg="bg-purple-100"
                                    label="Balance"
                                    value={`${summary.balance.accounts} Acc`}
                                    subtext="Active Accounts"
                                />
                            </>
                        ) : (
                            <>
                                <FinanceSummaryCard
                                    icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
                                    iconBg="bg-emerald-100"
                                    label="My Total Claims"
                                    value={summary.purchases.count + summary.reimburse.count}
                                    subtext={formatAmount(summary.purchases.amount + summary.reimburse.amount)}
                                />
                                <FinanceSummaryCard
                                    icon={<Receipt className="w-4 h-4 text-blue-600" />}
                                    iconBg="bg-blue-100"
                                    label="My Reimbursements"
                                    value={summary.reimburse.count}
                                    subtext={formatAmount(summary.reimburse.amount)}
                                />
                                <FinanceSummaryCard
                                    icon={<DollarSign className="w-4 h-4 text-orange-600" />}
                                    iconBg="bg-orange-100"
                                    label="Pending Items"
                                    value={summary.pendingPurchases.count + summary.pendingReimburse.count}
                                    subtext={formatAmount(summary.pendingPurchases.amount + summary.pendingReimburse.amount)}
                                />
                            </>
                        )}
                    </FinanceSummaryCardsRow>

                    {/* FINANCE PULSE (CONDENSED) */}
                    <FinancePulseBeta pulseData={data?.pulse} />

                    {/* RECENT PURCHASING SECTION */}
                    <div>
                        <button
                            onClick={() => router.push(`/flow/finance/purchasing?view=${viewMode}`)}
                            className="flex items-center gap-1.5 mb-4 group"
                        >
                            <h2 className="text-[19px] font-bold text-neutral-900 dark:text-white tracking-tight">Recent Purchasing</h2>
                            <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <div className="space-y-3">
                            {(viewMode === "team" ? [...(data.lists.goodsReceived || []), ...(data.lists.invoices || [])] : data.lists.myPurchaseHistory)
                                .slice(0, 3)
                                .map((item: any) => (
                                    <FinanceItemCard
                                        key={item.id}
                                        item={item}
                                        onClick={() => router.push(`/flow/finance/purchasing?view=${viewMode}&requestId=${item.id}`)}
                                    />
                                ))}
                        </div>
                    </div>

                    {/* RECENT REIMBURSE SECTION */}
                    <div className="pb-8">
                        <button
                            onClick={() => router.push(`/flow/finance/reimburse?view=${viewMode}`)}
                            className="flex items-center gap-1.5 mb-4 group"
                        >
                            <h2 className="text-[19px] font-bold text-neutral-900 dark:text-white tracking-tight">Recent Reimbursement</h2>
                            <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <div className="space-y-3">
                            {(viewMode === "team" ? data.lists.staffClaims : data.lists.myReimburseHistory)
                                .slice(0, 3)
                                .map((item: any) => (
                                    <FinanceItemCard
                                        key={item.id}
                                        item={item}
                                        onClick={() => router.push(`/flow/finance/reimburse?view=${viewMode}&requestId=${item.id}`)}
                                    />
                                ))}
                        </div>
                    </div>
                </div>
            )}

            <NewRequestDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                initialType={selectedType}
                onSuccess={() => {
                    fetchFinanceDashboardData().then(setData);
                }}
            />
        </FinancePageWrapper>
    );
}
