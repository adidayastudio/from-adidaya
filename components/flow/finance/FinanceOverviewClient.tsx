"use client";

import { useState, useEffect } from "react";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import {
    DollarSign,
    Receipt,
    Wallet,
    ArrowRight,
    Users,
    ShoppingCart,
    Plus,
    User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useFinance } from "./FinanceContext";
import {
    formatShort,
    formatAmount
} from "./modules/utils";
import { SummaryCard, SummaryCardsRow } from "@/components/shared/SummaryCard";
import { FinanceSummaryCard, FinanceSummaryCardsRow } from "./FinanceSummaryCard";
import { FinancePulse } from "./FinancePulse";
import { FinanceItemCard } from "./FinanceItemCard";
import { NewRequestDrawer } from "./modules/NewRequestDrawer";
import { RequestTypeSelector, RequestType } from "./modules/RequestTypeSelector";
import { fetchFinanceDashboardData } from "@/lib/client/finance-api";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

export default function FinanceOverviewClient() {
    const { viewMode, setViewMode, canAccessTeam, isLoading: isAuthLoading } = useFinance();
    const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<RequestType>("PURCHASE");
    const [listType, setListType] = useState<RequestType>("PURCHASE");
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

    // FAB Action Listener
    useEffect(() => {
        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'FINANCE_NEW_REQUEST') {
                setIsDrawerOpen(true);
            }
        };
        window.addEventListener('fab-action', handleFabAction);
        return () => window.removeEventListener('fab-action', handleFabAction);
    }, []);

    const handleNavigation = (path: string, params?: Record<string, string>) => {
        if (!params) {
            router.push(path);
            return;
        }
        const searchParams = new URLSearchParams(params);
        router.push(`${path}?${searchParams.toString()}`);
    };

    const isLoading = isAuthLoading || isLoadingData || !data;

    if (isLoading) {
        return <GlobalLoading />;
    }

    return (
        <FinancePageWrapper
            breadcrumbItems={[
                { label: "Flow", href: "/flow" },
                { label: "Finance", href: "/flow/finance" }
            ]}
            rightToolbar={
                <>
                    {canAccessTeam && (
                        <button
                            onClick={() => setViewMode(viewMode === 'team' ? 'personal' : 'team')}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-200 pointer-events-auto relative"
                        >
                            {viewMode === 'team' ? (
                                <Users className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                            ) : (
                                <User className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('fab-action', { detail: { id: 'FINANCE_NEW_REQUEST' } }))}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-200 pointer-events-auto relative"
                    >
                        <Plus className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                    </button>
                </>
            }
        >
            <div className="space-y-6">
                {/* FINANCE PULSE */}
                <div className="-mx-5 lg:hidden">
                    <FinancePulse pulseData={data?.pulse} />
                </div>

                {/* HEADER */}
                <div className="px-5 lg:px-0">
                    <FinanceHeader
                        title="Finance Overview"
                        subtitle={`Summary of team financial activity`}
                        hideToggle
                    />
                </div>

                {/* SUMMARY CARDS */}
                <div className="-mx-5 lg:mx-0">
                    <FinanceSummaryCardsRow>
                        {viewMode === "team" ? (
                            <>
                                <FinanceSummaryCard
                                    icon={<DollarSign className="w-4 h-4 text-green-600" />}
                                    iconBg="bg-green-100"
                                    label="Total Paid (Month)"
                                    value="+112%"
                                    valueColor="text-red-500"
                                    subtext={formatAmount(data.summary.team.totalPaid || 33000000)}
                                />
                                <FinanceSummaryCard
                                    icon={<Receipt className="w-4 h-4 text-orange-600" />}
                                    iconBg="bg-orange-100"
                                    label="Outstanding Bills"
                                    value={data.summary.team.outstanding.count || 3}
                                    subtext={formatAmount(data.summary.team.outstanding.amount || 207000000)}
                                />
                                <FinanceSummaryCard
                                    icon={<Users className="w-4 h-4 text-red-600" />}
                                    iconBg="bg-red-100"
                                    label="Reimburse Pending"
                                    value={data.summary.team.reimbursePending.count || 1}
                                    subtext={formatAmount(data.summary.team.reimbursePending.amount || 12000000)}
                                />
                                <FinanceSummaryCard
                                    icon={<Wallet className="w-4 h-4 text-purple-600" />}
                                    iconBg="bg-purple-100"
                                    label="Balance"
                                    value="12K"
                                    subtext={`${data.summary.team.balance.accounts || 1} Accounts`}
                                />
                            </>
                        ) : (
                            <>
                                <FinanceSummaryCard
                                    icon={<ShoppingCart className="w-4 h-4 text-green-600" />}
                                    iconBg="bg-green-100"
                                    label="My Purchases (Paid)"
                                    value={data.summary.personal.purchases.count}
                                    subtext={formatAmount(data.summary.personal.purchases.amount)}
                                />
                                <FinanceSummaryCard
                                    icon={<Receipt className="w-4 h-4 text-green-600" />}
                                    iconBg="bg-green-100"
                                    label="My Reimbursements"
                                    value={data.summary.personal.reimburse.count}
                                    subtext={formatAmount(data.summary.personal.reimburse.amount)}
                                />
                                <FinanceSummaryCard
                                    icon={<DollarSign className="w-4 h-4 text-orange-600" />}
                                    iconBg="bg-orange-100"
                                    label="Pending Purchases"
                                    value={data.summary.personal.pendingPurchases.count}
                                    subtext={formatAmount(data.summary.personal.pendingPurchases.amount)}
                                />
                                <FinanceSummaryCard
                                    icon={<Wallet className="w-4 h-4 text-purple-600" />}
                                    iconBg="bg-purple-100"
                                    label="Pending Reimbursement"
                                    value={data.summary.personal.pendingReimburse.count}
                                    subtext={formatAmount(data.summary.personal.pendingReimburse.amount)}
                                />
                            </>
                        )}
                    </FinanceSummaryCardsRow>
                </div>

                {/* LIST CONTENT (NO BIG CARD) */}
                <div className="px-5 space-y-8">
                    {/* PURCHASING SECTION */}
                    <div>
                        <button
                            onClick={() => handleNavigation('/flow/finance/purchasing', { view: viewMode })}
                            className="flex items-center gap-1.5 mb-4 group"
                        >
                            <h2 className="text-[17px] font-bold text-neutral-900 dark:text-white tracking-tight">Recent Purchasing</h2>
                            <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <div className="space-y-3">
                            {viewMode === "team" ? (
                                <>
                                    {[...(data.lists.goodsReceived || []), ...(data.lists.invoices || [])]
                                        .slice(0, 3)
                                        .map((item: any) => (
                                            <FinanceItemCard
                                                key={item.id}
                                                idRef={item.id.replace('req_', 'PO-24-').substring(0, 9)}
                                                title={item.description}
                                                projectCode={item.project?.project_code || 'GEN'}
                                                date={new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                amount={item.amount}
                                                status={item.status === 'UNPAID' ? 'Pending' : 'Submitted'}
                                                onClick={() => router.push(`/flow/finance/purchasing?view=team&id=${item.id}`)}
                                            />
                                        ))}
                                    {(!data.lists.goodsReceived?.length && !data.lists.invoices?.length) && (
                                        <p className="text-sm text-neutral-400 dark:text-neutral-500 italic">No pending items found.</p>
                                    )}
                                </>
                            ) : (
                                <>
                                    {data.lists.myPurchaseHistory.slice(0, 3).map((p: any) => (
                                        <FinanceItemCard
                                            key={p.id}
                                            idRef={p.id.replace('req_', 'PO-24-').substring(0, 9)}
                                            title={p.description || "Purchase Item"}
                                            projectCode={p.project?.project_code || 'GEN'}
                                            date={new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            amount={p.amount}
                                            status={p.status}
                                            onClick={() => router.push(`/flow/finance/purchasing?view=personal&id=${p.id}`)}
                                        />
                                    ))}
                                    {data.lists.myPurchaseHistory.length === 0 && (
                                        <p className="text-sm text-neutral-400 dark:text-neutral-500 italic">No purchase history found.</p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* REIMBURSE SECTION */}
                    <div className="pb-8">
                        <button
                            onClick={() => handleNavigation('/flow/finance/reimburse', { view: viewMode })}
                            className="flex items-center gap-1.5 mb-4 group opacity-50"
                        >
                            <h2 className="text-[17px] font-bold text-neutral-900 dark:text-white tracking-tight">Recent Reimbursement</h2>
                            <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>

            {/* SHARED DRAWER */}
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
