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
    cleanEntityName
} from "./modules/utils";
import { SummaryCard } from "./modules/SummaryCard";
import { AttentionItemRow } from "./modules/AttentionItemRow";
import { RecentActivityList } from "./modules/RecentActivityList";
import { NewRequestDrawer } from "./modules/NewRequestDrawer";
import { RequestTypeSelector, RequestType } from "./modules/RequestTypeSelector";
import { PersonalPurchaseRow, PersonalReimburseRow } from "./modules/PersonalTransactionRows";
import { fetchFinanceDashboardData } from "@/lib/api/finance";

// Sort by: 1) deadline closest (expired first), 2) highest amount
function sortAttentionItems(items: any[]): any[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...items].sort((a, b) => {
        const aDate = new Date(a.date || a.created_at);
        const bDate = new Date(b.date || b.created_at);
        return aDate.getTime() - bDate.getTime(); // Oldest first for attention
    });
}

export default function FinanceOverviewClient() {
    const { viewMode, isLoading: isAuthLoading, userId } = useFinance();
    const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [listType, setListType] = useState<RequestType>("PURCHASE");
    const [data, setData] = useState<any>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (userId) {
            setIsLoadingData(true);
            fetchFinanceDashboardData(userId)
                .then(res => setData(res))
                .catch(err => console.error("Failed to load dashboard data", err))
                .finally(() => setIsLoadingData(false));
        }
    }, [userId]);

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
        return <div className="p-8 text-center text-neutral-500">Loading finance data...</div>;
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
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {viewMode === "team" ? (
                        <>
                            <SummaryCard
                                icon={<DollarSign className="w-5 h-5 text-green-600" />}
                                iconBg="bg-green-50"
                                label="Total Paid (Month)"
                                value={formatShort(data.summary.team.totalPaidThisMonth)}
                                subtext="vs prev. month"
                                trend="up"
                            />
                            <SummaryCard
                                icon={<Receipt className="w-5 h-5 text-orange-600" />}
                                iconBg="bg-orange-50"
                                label="Outstanding Bills"
                                value={formatShort(data.summary.team.outstanding)}
                                subtext="pending payment"
                            />
                            <SummaryCard
                                icon={<Users className="w-5 h-5 text-red-600" />}
                                iconBg="bg-red-50"
                                label="Reimburse Pending"
                                value={formatShort(data.summary.team.reimbursePending)}
                                subtext="waiting approval"
                            />
                            <SummaryCard
                                icon={<Wallet className="w-5 h-5 text-purple-600" />}
                                iconBg="bg-purple-50"
                                label="Petty Cash Balance"
                                value={formatShort(data.summary.team.pettyCashBalance)}
                                subtext="Total balance"
                            />
                        </>
                    ) : (
                        <>
                            <SummaryCard
                                icon={<ShoppingCart className="w-5 h-5 text-red-600" />}
                                iconBg="bg-red-50"
                                label="My Purchases"
                                value={data.summary.personal.myPurchases.toString()}
                                subtext="This month"
                            />
                            <SummaryCard
                                icon={<Receipt className="w-5 h-5 text-purple-600" />}
                                iconBg="bg-purple-50"
                                label="My Reimbursements"
                                value={data.summary.personal.myReimburse.toString()}
                                subtext="This month"
                            />
                            <SummaryCard
                                icon={<DollarSign className="w-5 h-5 text-orange-600" />}
                                iconBg="bg-orange-50"
                                label="Pending Approval"
                                value={formatShort(data.summary.personal.pendingApproval)}
                                subtext="Awaiting manager"
                            />
                            <SummaryCard
                                icon={<Wallet className="w-5 h-5 text-green-600" />}
                                iconBg="bg-green-50"
                                label="Paid to Me"
                                value={formatShort(data.summary.personal.paid)}
                                subtext="Transferred"
                            />
                        </>
                    )}
                </section>

                {/* ONE BIG CARD: REQUESTS */}
                <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                    {/* INTEGRATED HEADER */}
                    <div className="px-6 py-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                                {viewMode === "team" ? "Team Requests" : "My Requests"}
                            </h2>
                            <div className="w-48">
                                <RequestTypeSelector
                                    activeType={listType}
                                    onTypeChange={setListType}
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => setIsDrawerOpen(true)}
                            className="h-10 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Request
                        </button>
                    </div>

                    {/* LIST CONTENT */}
                    <div className="flex-1">
                        {viewMode === "team" ? (
                            <div className="divide-y divide-neutral-100/50">
                                {listType === "PURCHASE" ? (
                                    <>
                                        {/* GOODS RECEIVED */}
                                        <div className="px-6 py-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xs font-bold text-orange-600 uppercase tracking-widest bg-orange-50 px-3 py-1.5 rounded-lg">
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
                                                            quantity: `${item.quantity} ${item.unit}`,
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
                                        <div className="px-6 py-5 bg-neutral-50/30">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xs font-bold text-yellow-600 uppercase tracking-widest bg-yellow-50 px-3 py-1.5 rounded-lg">
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
                                                            quantity: `${item.quantity} ${item.unit}`,
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
                                ) : (
                                    /* REIMBURSE TEAM LIST */
                                    <div className="px-6 py-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-lg">
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
                                                        quantity: item.qty || '1',
                                                        projectCode: item.project?.project_code || 'N/A',
                                                        projectName: item.project?.project_name || 'Project',
                                                        submittedDate: item.created_at,
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
                            <div className="px-6 py-5">
                                {listType === "PURCHASE" ? (
                                    <div className="space-y-6">
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
                                        <div className="space-y-2">
                                            {data.lists.myPurchaseHistory.map((p: any) => (
                                                <PersonalPurchaseRow
                                                    key={p.id}
                                                    item={{
                                                        id: p.id,
                                                        description: p.description,
                                                        quantity: 1,
                                                        unit: 'lot',
                                                        vendor: p.vendor || 'Unknown Vendor',
                                                        project_name: p.project?.project_name || 'General',
                                                        project_code: p.project?.project_code || 'GEN',
                                                        amount: p.amount,
                                                        financial_status: p.financial_status,
                                                        approval_status: p.approval_status,
                                                        purchase_stage: p.purchase_stage,
                                                        type: p.type || 'MATERIAL',
                                                        date: p.date || p.created_at,
                                                        project_id: p.project_id || 'general',
                                                        created_by: "Me",
                                                        created_at: p.created_at,
                                                        updated_at: p.updated_at
                                                    }}
                                                />
                                            ))}
                                            {data.lists.myPurchaseHistory.length === 0 && (
                                                <p className="text-sm text-neutral-400 italic">No purchase history found.</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
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
                                        <div className="space-y-2">
                                            {data.lists.myReimburseHistory.map((r: any) => (
                                                <PersonalReimburseRow
                                                    key={r.id}
                                                    item={{
                                                        id: r.id,
                                                        description: r.description,
                                                        quantity: r.quantity || '1',
                                                        project_name: r.project?.project_name || 'General',
                                                        amount: r.amount,
                                                        status: r.status,
                                                        created_at: r.created_at,
                                                        staff_id: 'me',
                                                        staff_name: 'You',
                                                        project_id: r.project_id || 'general',
                                                        project_code: r.project?.project_code || 'GEN',
                                                        updated_at: r.updated_at,
                                                        category: r.category || 'General'
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

                {/* TEAM VIEW: RECENT ACTIVITY AT BOTTOM */}
                {viewMode === "team" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-4">
                            <div>
                                <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Recent Activity</h2>
                                <p className="text-sm text-neutral-500">Latest financial transactions and event updates</p>
                            </div>
                            <button className="text-xs font-medium text-neutral-400 hover:text-red-600 flex items-center gap-1 group transition-colors">
                                View Full Log <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl shadow-sm px-6 py-5">
                            <RecentActivityList activities={data.lists.recentActivity.map((a: any) => ({
                                id: a.id,
                                action: a.type === 'PURCHASE' ? (a.approval_status === 'APPROVED' ? 'Purchase Approved' : 'New Purchase Request') : (a.status === 'APPROVED' ? 'Reimbursement Approved' : 'New Reimbursement'),
                                description: `${a.description} - ${formatShort(a.amount)}`,
                                user: cleanEntityName(a.created_by_name || a.staff_name || 'Unknown User'),
                                timestamp: a.updated_at
                            }))} />
                        </div>
                    </div>
                )}
            </div>

            {/* SHARED DRAWER */}
            <NewRequestDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSuccess={() => {
                    if (userId) {
                        fetchFinanceDashboardData(userId).then(setData);
                    }
                }}
            />
        </FinancePageWrapper>
    );
}
