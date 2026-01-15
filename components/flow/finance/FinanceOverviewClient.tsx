
"use client";

import { useState } from "react";
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
import {
    AttentionItem
} from "@/lib/types/finance-types";
import { useFinance } from "./FinanceContext";
import {
    formatShort,
} from "./modules/utils";
import { SummaryCard } from "./modules/SummaryCard";
import { AttentionItemRow } from "./modules/AttentionItemRow";
import { RecentActivityList } from "./modules/RecentActivityList";
import { NewRequestDrawer } from "./modules/NewRequestDrawer";
import { RequestTypeSelector, RequestType } from "./modules/RequestTypeSelector";
import { PersonalPurchaseRow, PersonalReimburseRow } from "./modules/PersonalTransactionRows";
import { MOCK_TEAM_SUMMARY, MOCK_GOODS_RECEIVED, MOCK_INVOICES, MOCK_STAFF_CLAIMS, MOCK_RECENT_ACTIVITY, MOCK_PERSONAL_SUMMARY, MOCK_MY_PURCHASES, MOCK_MY_REIMBURSE } from "./modules/mocks";

// Sort by: 1) deadline closest (expired first), 2) highest amount
function sortAttentionItems(items: AttentionItem[]): AttentionItem[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...items].sort((a, b) => {
        const aDeadline = a.deadline ? new Date(a.deadline) : null;
        const bDeadline = b.deadline ? new Date(b.deadline) : null;
        const aOverdue = aDeadline && aDeadline <= today;
        const bOverdue = bDeadline && bDeadline <= today;

        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;

        if (aDeadline && bDeadline) {
            const diff = aDeadline.getTime() - bDeadline.getTime();
            if (diff !== 0) return diff;
        }
        if (aDeadline && !bDeadline) return -1;
        if (!aDeadline && bDeadline) return 1;

        return b.amount - a.amount;
    });
}

export default function FinanceOverviewClient() {
    const { viewMode, isLoading } = useFinance();
    const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [listType, setListType] = useState<RequestType>("PURCHASE");
    const router = useRouter();

    const handleNavigation = (path: string, params?: Record<string, string>) => {
        if (!params) {
            router.push(path);
            return;
        }
        const searchParams = new URLSearchParams(params);
        router.push(`${path}?${searchParams.toString()}`);
    };

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
                                value={formatShort(MOCK_TEAM_SUMMARY.totalPaidThisMonth)}
                                subtext="vs prev. month"
                                trend="up"
                            />
                            <SummaryCard
                                icon={<Receipt className="w-5 h-5 text-orange-600" />}
                                iconBg="bg-orange-50"
                                label="Outstanding Bills"
                                value={formatShort(MOCK_TEAM_SUMMARY.outstanding)}
                                subtext="12 invoices pending"
                            />
                            <SummaryCard
                                icon={<Users className="w-5 h-5 text-red-600" />}
                                iconBg="bg-red-50"
                                label="Reimburse Pending"
                                value={formatShort(MOCK_TEAM_SUMMARY.reimbursePending)}
                                subtext="5 requests waiting"
                            />
                            <SummaryCard
                                icon={<Wallet className="w-5 h-5 text-purple-600" />}
                                iconBg="bg-purple-50"
                                label="Petty Cash Balance"
                                value={formatShort(MOCK_TEAM_SUMMARY.pettyCashBalance)}
                                subtext="Across 3 projects"
                            />
                        </>
                    ) : (
                        <>
                            <SummaryCard
                                icon={<ShoppingCart className="w-5 h-5 text-red-600" />}
                                iconBg="bg-red-50"
                                label="My Purchases"
                                value={MOCK_PERSONAL_SUMMARY.myPurchases.toString()}
                                subtext="This month"
                            />
                            <SummaryCard
                                icon={<Receipt className="w-5 h-5 text-purple-600" />}
                                iconBg="bg-purple-50"
                                label="My Reimbursements"
                                value={MOCK_PERSONAL_SUMMARY.myReimburse.toString()}
                                subtext="This month"
                            />
                            <SummaryCard
                                icon={<DollarSign className="w-5 h-5 text-orange-600" />}
                                iconBg="bg-orange-50"
                                label="Pending Approval"
                                value={formatShort(MOCK_PERSONAL_SUMMARY.pendingApproval)}
                                subtext="Awaiting manager"
                            />
                            <SummaryCard
                                icon={<Wallet className="w-5 h-5 text-green-600" />}
                                iconBg="bg-green-50"
                                label="Paid to Me"
                                value={formatShort(MOCK_PERSONAL_SUMMARY.paid)}
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
                                                {sortAttentionItems(MOCK_GOODS_RECEIVED).slice(0, 5).map(item => (
                                                    <AttentionItemRow key={item.id} item={item} onClick={() => { }} />
                                                ))}
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
                                                {sortAttentionItems(MOCK_INVOICES).slice(0, 3).map(item => (
                                                    <AttentionItemRow key={item.id} item={item} onClick={() => { }} />
                                                ))}
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
                                            {sortAttentionItems(MOCK_STAFF_CLAIMS).slice(0, 10).map(item => (
                                                <AttentionItemRow key={item.id} item={item} onClick={() => { }} />
                                            ))}
                                            {MOCK_STAFF_CLAIMS.length === 0 && (
                                                <div className="py-20 text-center">
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
                                            {MOCK_MY_PURCHASES.map(p => (
                                                <PersonalPurchaseRow
                                                    key={p.id}
                                                    item={{
                                                        id: p.id,
                                                        description: p.description,
                                                        quantity: p.quantity,
                                                        vendor: p.beneficiary,
                                                        project_name: p.projectName,
                                                        amount: p.amount,
                                                        financial_status: p.type === 'invoice' ? 'UNPAID_INVOICED' : 'UNPAID_RECEIVED',
                                                        type: 'MATERIAL',
                                                        date: p.submittedDate,
                                                        project_id: p.projectCode,
                                                        created_by: "Me",
                                                        created_at: p.submittedDate,
                                                        updated_at: p.submittedDate
                                                    }}
                                                />
                                            ))}
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
                                            {MOCK_MY_REIMBURSE.map(r => (
                                                <PersonalReimburseRow
                                                    key={r.id}
                                                    item={{
                                                        id: r.id,
                                                        description: r.description,
                                                        quantity: r.quantity,
                                                        project_name: r.projectName,
                                                        amount: r.amount,
                                                        status: 'PENDING',
                                                        created_at: r.submittedDate,
                                                        staff_id: 'me',
                                                        staff_name: 'You',
                                                        project_id: r.projectCode,
                                                        updated_at: r.submittedDate
                                                    }}
                                                />
                                            ))}
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
                            <RecentActivityList activities={MOCK_RECENT_ACTIVITY} />
                        </div>
                    </div>
                )}
            </div>

            {/* SHARED DRAWER */}
            <NewRequestDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
            />
        </FinancePageWrapper>
    );
}
