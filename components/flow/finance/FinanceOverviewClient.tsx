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
    const { viewMode, setViewMode, canAccessTeam, isLoading: isAuthLoading } = useFinance();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedType] = useState<RequestType>("PURCHASE");
    const [data, setData] = useState<any>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const loadWithWorkspace = async () => {
            setIsLoadingData(true);
            try {
                const wsId = await fetchDefaultWorkspaceId();
                const res = await fetchFinanceDashboardData(wsId || undefined);
                setData(res);
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setIsLoadingData(false);
            }
        };
        loadWithWorkspace();
    }, []);

    const isLoading = isAuthLoading || isLoadingData || !data;

    if (isLoading) {
        return <GlobalLoading />;
    }

    const summary = viewMode === "team" ? data.summary.team : data.summary.personal;

    return (
        <FinancePageWrapper
            breadcrumbItems={[]}
            header={
                <FinanceHeader 
                    title="Finance" 
                    subtitle={viewMode === 'team' ? "Team financial health and summary." : "Your personal expense and claim summary."} 
                />
            }
            rightToolbar={
                <div className="flex items-center gap-1">
                    {canAccessTeam && (
                        <button
                            onClick={() => setViewMode(viewMode === 'team' ? 'personal' : 'team')}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 transition-all duration-200"
                        >
                            {viewMode === 'team' ? (
                                <Users className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                            ) : (
                                <User className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-95 transition-all duration-200 pointer-events-auto relative"
                    >
                        <Plus className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                    </button>
                </div>
            }
        >
            <div className="space-y-6 pb-10">
                {/* SUMMARY CARDS GRID */}
                <FinanceSummaryCardsRow className="-mx-5 !mb-0">
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
