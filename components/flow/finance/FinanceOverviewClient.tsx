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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useFinance } from "./FinanceContext";
import {
    formatShort,
    formatAmount
} from "./modules/utils";
import { SummaryCard, SummaryCardsRow } from "@/components/shared/SummaryCard";
import { AttentionItemRow } from "./modules/AttentionItemRow";
import { NewRequestDrawer } from "./modules/NewRequestDrawer";
import { RequestTypeSelector, RequestType } from "./modules/RequestTypeSelector";
import { PersonalPurchaseRow, PersonalReimburseRow } from "./modules/PersonalTransactionRows";
import { fetchFinanceDashboardData } from "@/lib/client/finance-api";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

export default function FinanceOverviewClient() {
    const { viewMode, isLoading: isAuthLoading } = useFinance();
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
        >
            <div className="space-y-6">
                {/* HEADER */}
                <FinanceHeader
                    title="Finance Overview"
                    subtitle={`Financial summary for ${currentMonth}`}
                />

                {/* SUMMARY CARDS */}
                <SummaryCardsRow>
                    {viewMode === "team" ? (
                        <>
                            <SummaryCard
                                icon={<DollarSign className="w-5 h-5 text-green-600" />}
                                iconBg="bg-green-50"
                                label="Total Paid (Month)"
                                value={formatShort(data.summary.team.totalPaid)}
                                subtext={data.summary.team.trend === 0 ? "vs prev. month" : `${data.summary.team.trend > 0 ? '+' : ''}${data.summary.team.trend}% vs last month`}
                                trend={data.summary.team.trend >= 0 ? 'up' : 'down'}
                            />
                            <SummaryCard
                                icon={<Receipt className="w-5 h-5 text-orange-600" />}
                                iconBg="bg-orange-50"
                                label="Outstanding Bills"
                                value={data.summary.team.outstanding.count}
                                subtext={formatAmount(data.summary.team.outstanding.amount)}
                            />
                            <SummaryCard
                                icon={<Users className="w-5 h-5 text-red-600" />}
                                iconBg="bg-red-50"
                                label="Reimburse Pending"
                                value={data.summary.team.reimbursePending.count}
                                subtext={formatAmount(data.summary.team.reimbursePending.amount)}
                            />
                            <SummaryCard
                                icon={<Wallet className="w-5 h-5 text-purple-600" />}
                                iconBg="bg-purple-50"
                                label="Balance"
                                value={formatShort(data.summary.team.balance.total)}
                                subtext={`${data.summary.team.balance.accounts} Accounts`}
                            />
                        </>
                    ) : (
                        <>
                            <SummaryCard
                                icon={<ShoppingCart className="w-5 h-5 text-green-600" />}
                                iconBg="bg-green-50"
                                label="My Purchases (Paid)"
                                value={data.summary.personal.purchases.count}
                                subtext={formatAmount(data.summary.personal.purchases.amount)}
                            />
                            <SummaryCard
                                icon={<Receipt className="w-5 h-5 text-green-600" />}
                                iconBg="bg-green-50"
                                label="My Reimbursements (Paid)"
                                value={data.summary.personal.reimburse.count}
                                subtext={formatAmount(data.summary.personal.reimburse.amount)}
                            />
                            <SummaryCard
                                icon={<DollarSign className="w-5 h-5 text-orange-600" />}
                                iconBg="bg-orange-50"
                                label="Pending Purchases"
                                value={data.summary.personal.pendingPurchases.count}
                                subtext={formatAmount(data.summary.personal.pendingPurchases.amount)}
                            />
                            <SummaryCard
                                icon={<Wallet className="w-5 h-5 text-orange-600" />}
                                iconBg="bg-orange-50"
                                label="Pending Reimbursement"
                                value={data.summary.personal.pendingReimburse.count}
                                subtext={formatAmount(data.summary.personal.pendingReimburse.amount)}
                            />
                        </>
                    )}
                </SummaryCardsRow>

                {/* ONE BIG CARD: REQUESTS */}
                <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                    {/* INTEGRATED HEADER */}
                    <div className="px-6 py-4 border-b border-neutral-100/50">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
                                {viewMode === "team" ? "Team Requests" : "My Requests"}
                            </h2>
                            <div className="flex items-center gap-2">
                                <div className="w-44 sm:w-52">
                                    <RequestTypeSelector
                                        activeType={listType}
                                        onTypeChange={setListType}
                                    />
                                </div>
                                <button
                                    onClick={() => setIsDrawerOpen(true)}
                                    className="hidden sm:flex h-9 px-3 sm:px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[13px] font-bold shadow-lg shadow-red-600/20 active:scale-95 transition-all items-center gap-1.5"
                                >
                                    <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                                    <span className="hidden sm:inline">New Request</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* LIST CONTENT */}
                    <div className="flex-1">
                        {viewMode === "team" ? (
                            <div className="divide-y divide-neutral-100/50">
                                {listType === "PURCHASE" && (
                                    <>
                                        {/* GOODS RECEIVED */}
                                        <div className="px-6 py-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2.5 py-1 rounded-lg">
                                                    Goods Received (Unpaid)
                                                </h3>
                                                <button
                                                    onClick={() => handleNavigation('/flow/finance/purchasing', { view: 'team', status: 'UNPAID_RECEIVED' })}
                                                    className="text-xs font-medium text-neutral-400 hover:text-red-600 flex items-center gap-1 group transition-colors"
                                                >
                                                    View All <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                            <div className="space-y-1">
                                                {data.lists.goodsReceived.map((item: any) => (
                                                    <AttentionItemRow
                                                        key={item.id}
                                                        item={{
                                                            id: item.id,
                                                            type: 'goods_received',
                                                            description: item.description,
                                                            projectCode: item.project?.project_code || 'N/A',
                                                            projectName: item.project?.project_name || 'Project',
                                                            submittedDate: item.date,
                                                            beneficiary: item.vendor,
                                                            beneficiaryType: 'vendor',
                                                            amount: item.amount
                                                        }}
                                                        onClick={() => router.push(`/flow/finance/purchasing?view=team&id=${item.id}`)}
                                                    />
                                                ))}
                                                {data.lists.goodsReceived.length === 0 && (
                                                    <p className="text-sm text-neutral-400 italic pl-2">No pending items found.</p>
                                                )}
                                            </div>
                                        </div>
                                        {/* INVOICES */}
                                        <div className="px-6 py-4 bg-neutral-50/30">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-[10px] font-black text-yellow-600 uppercase tracking-widest bg-yellow-50 px-2.5 py-1 rounded-lg">
                                                    Invoices Pending
                                                </h3>
                                                <button
                                                    onClick={() => handleNavigation('/flow/finance/purchasing', { view: 'team', status: 'UNPAID_INVOICED' })}
                                                    className="text-xs font-medium text-neutral-400 hover:text-red-600 flex items-center gap-1 group transition-colors"
                                                >
                                                    View All <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                            <div className="space-y-1">
                                                {data.lists.invoices.map((item: any) => (
                                                    <AttentionItemRow
                                                        key={item.id}
                                                        item={{
                                                            id: item.id,
                                                            type: 'invoice',
                                                            description: item.description,
                                                            projectCode: item.project?.project_code || 'N/A',
                                                            projectName: item.project?.project_name || 'Project',
                                                            submittedDate: item.date,
                                                            beneficiary: item.vendor,
                                                            beneficiaryType: 'vendor',
                                                            amount: item.amount
                                                        }}
                                                        onClick={() => router.push(`/flow/finance/purchasing?view=team&id=${item.id}`)}
                                                    />
                                                ))}
                                                {data.lists.invoices.length === 0 && (
                                                    <p className="text-sm text-neutral-400 italic pl-2">No pending invoices found.</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {listType === "REIMBURSE" && (
                                    <div className="px-6 py-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2.5 py-1 rounded-lg">
                                                Reimburse Approval
                                            </h3>
                                            <button
                                                onClick={() => handleNavigation('/flow/finance/reimburse', { view: 'team', status: 'PENDING' })}
                                                className="text-xs font-medium text-neutral-400 hover:text-red-600 flex items-center gap-1 group transition-colors"
                                            >
                                                View All <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                        <div className="space-y-1">
                                            {data.lists.staffClaims.map((item: any) => (
                                                <AttentionItemRow
                                                    key={item.id}
                                                    item={{
                                                        id: item.id,
                                                        type: 'staff_claim',
                                                        description: item.description,
                                                        projectCode: item.project?.project_code || 'N/A',
                                                        projectName: item.project?.project_name || 'Project',
                                                        submittedDate: item.date,
                                                        beneficiary: item.staff_name || 'Staff',
                                                        beneficiaryType: 'staff',
                                                        amount: item.amount
                                                    }}
                                                    onClick={() => router.push(`/flow/finance/reimburse?view=team&id=${item.id}`)}
                                                />
                                            ))}
                                            {data.lists.staffClaims.length === 0 && (
                                                <div className="py-10 text-center">
                                                    <Receipt className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
                                                    <p className="text-neutral-400 text-sm font-medium">No reimbursement requests</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* PERSONAL VIEW */
                            <div className="px-6 py-4">
                                {listType === "PURCHASE" && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                                                <ShoppingCart className="w-4 h-4 text-red-500" /> My Recent Purchases
                                            </h3>
                                            <button
                                                onClick={() => handleNavigation('/flow/finance/purchasing', { view: 'personal' })}
                                                className="text-xs font-medium text-neutral-400 hover:text-red-600 flex items-center gap-1 group transition-colors"
                                            >
                                                View History <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                        <div className="space-y-1.5">
                                            {data.lists.myPurchaseHistory.map((p: any) => (
                                                <PersonalPurchaseRow
                                                    key={p.id}
                                                    item={{
                                                        ...p,
                                                        project_name: p.project?.project_name || 'General',
                                                        project_code: p.project?.project_code || 'GEN'
                                                    }}
                                                />
                                            ))}
                                            {data.lists.myPurchaseHistory.length === 0 && (
                                                <p className="text-sm text-neutral-400 italic">No purchase history found.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {listType === "REIMBURSE" && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                                                <Receipt className="w-4 h-4 text-purple-500" /> My Reimbursements
                                            </h3>
                                            <button
                                                onClick={() => handleNavigation('/flow/finance/reimburse', { view: 'personal' })}
                                                className="text-xs font-medium text-neutral-400 hover:text-red-600 flex items-center gap-1 group transition-colors"
                                            >
                                                View History <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                        <div className="space-y-1.5">
                                            {data.lists.myReimburseHistory.map((r: any) => (
                                                <PersonalReimburseRow
                                                    key={r.id}
                                                    item={{
                                                        ...r,
                                                        project_name: r.project?.project_name || 'General',
                                                        project_code: r.project?.project_code || 'GEN'
                                                    }}
                                                />
                                            ))}
                                            {data.lists.myReimburseHistory.length === 0 && (
                                                <p className="text-sm text-neutral-400 italic">No reimbursement history found.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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
