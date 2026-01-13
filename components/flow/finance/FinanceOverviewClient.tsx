"use client";

import { useMemo } from "react";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import { DollarSign, Clock, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Building2 } from "lucide-react";
import clsx from "clsx";
import { Expense, getExpenseSummary } from "@/app/flow/finance/actions"; // Updated import path
import { format } from "date-fns";
import { useFinance } from "./FinanceContext";

// --- MOCK DATA FOR TEAM VIEW (Finance Overview) ---
const MOCK_TEAM_SUMMARY = {
    totalRevenue: 850000000,
    totalExpenses: 520000000,
    netProfit: 330000000,
    pendingInvoices: 125000000,
    cashOnHand: 275000000,
};

const MOCK_TEAM_TOP_PROJECTS = [
    { name: "Rumah Pak Budi - Kemang", revenue: 180000000, expenses: 95000000 },
    { name: "Renovasi Kantor ABC", revenue: 150000000, expenses: 85000000 },
    { name: "Villa Puncak Project", revenue: 120000000, expenses: 78000000 },
];

const MOCK_TEAM_ALERTS = [
    { type: "warning", title: "Overdue Invoice", message: "Invoice #INV-2024-089 is 15 days overdue" },
    { type: "info", title: "Payment Due", message: "Rp 45,000,000 payment due in 3 days" },
];

// --- MOCK DATA FOR PERSONAL VIEW (Budget etc) ---
const MOCK_PERSONAL_SUMMARY = {
    myProjects: 3,
    totalBudget: 450000000,
    usedBudget: 285000000,
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace(/\u00a0/g, " ");
}

function formatShort(amount: number) {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(0)}M`;
    return formatCurrency(amount);
}

function SummaryCard({ icon, iconBg, label, value, subtext, trend }: { icon: React.ReactNode; iconBg: string; label: string; value: string; subtext?: string; trend?: "up" | "down" }) {
    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-red-200 transition-colors group">
            <div className="flex items-start justify-between mb-3">
                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
                    {icon}
                </div>
                {trend && (
                    <div className={clsx("flex items-center gap-1 text-xs font-medium", trend === "up" ? "text-green-600" : "text-red-600")}>
                        {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {trend === "up" ? "+12%" : "-8%"}
                    </div>
                )}
            </div>
            <div className="text-sm font-medium text-neutral-500 mb-1">{label}</div>
            <div className="text-2xl font-bold text-neutral-900 tracking-tight">{value}</div>
            {subtext && <div className="text-xs text-neutral-400 mt-1">{subtext}</div>}
        </div>
    );
}

function ProjectFinanceRow({ name, revenue, expenses }: { name: string; revenue: number; expenses: number }) {
    const profit = revenue - expenses;
    const margin = ((profit / revenue) * 100).toFixed(0);
    return (
        <div className="flex items-center gap-4 py-4 border-b border-neutral-100 last:border-0">
            <div className="flex-1 min-w-0">
                <div className="font-medium text-neutral-900 truncate">{name}</div>
                <div className="flex gap-4 mt-1 text-sm">
                    <span className="text-green-600">+{formatShort(revenue)}</span>
                    <span className="text-red-600">-{formatShort(expenses)}</span>
                </div>
            </div>
            <div className="text-right">
                <div className="font-semibold text-neutral-900">{formatShort(profit)}</div>
                <div className="text-xs text-neutral-500">{margin}% margin</div>
            </div>
        </div>
    );
}

function AlertItem({ type, title, message }: { type: string; title: string; message: string }) {
    const isWarning = type === "warning";
    return (
        <div className={clsx("flex items-start gap-3 p-4 rounded-xl border", isWarning ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-200")}>
            <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", isWarning ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600")}>
                <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
                <div className={clsx("font-medium text-sm", isWarning ? "text-orange-900" : "text-blue-900")}>{title}</div>
                <div className={clsx("text-sm mt-0.5", isWarning ? "text-orange-700" : "text-blue-700")}>{message}</div>
            </div>
        </div>
    );
}

function PersonalExpenseRow({ date, project, type, amount, status }: { date: string; project: string; type: string; amount: number; status: string }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
            <div className="flex-1">
                <div className="font-medium text-neutral-900">{type}</div>
                <div className="text-sm text-neutral-500">{project} · {format(new Date(date), "dd MMM yyyy")}</div>
            </div>
            <div className="text-right">
                <div className="font-medium text-neutral-900">{formatCurrency(amount)}</div>
                <span className={clsx(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    status === "Paid" ? "bg-green-50 text-green-700" :
                        status === "Pending" ? "bg-orange-50 text-orange-700" :
                            status === "Rejected" ? "bg-red-50 text-red-700" : "bg-neutral-100 text-neutral-600"
                )}>
                    {status}
                </span>
            </div>
        </div>
    );
}

interface FinanceOverviewClientProps {
    expenses: Expense[];
    userId: string | null;
}

export default function FinanceOverviewClient({ expenses, userId }: FinanceOverviewClientProps) {
    const { viewMode } = useFinance();
    const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

    // Personal View Data logic
    const { personalSummary, recentExpenses } = useMemo(() => {
        // Filter expenses for current user (Personal View)
        // If Role is STAFF, expenses should already be filtered by RLS/Server query.
        // But for Admin toggling to Personal, we filter in client if we have ALL expenses.
        // Assuming 'expenses' passed here contains what the USER is allowed to see.
        // If Admin, 'expenses' = ALL. We filter by userId.
        // If Staff, 'expenses' = OWN. Filter by userId is redundancy (safe).

        // Wait, if userId is null (not passed?), we can't filter.
        // But userId is passed.

        const myExpenses = expenses.filter(e => e.user_id === userId);

        const totalExpense = myExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const pendingApproval = myExpenses.filter(e => e.status === "Pending").reduce((sum, e) => sum + Number(e.amount), 0);
        const pendingCount = myExpenses.filter(e => e.status === "Pending").length;

        return {
            personalSummary: { ...MOCK_PERSONAL_SUMMARY, totalExpense, pendingApproval, pendingCount },
            recentExpenses: myExpenses.slice(0, 5) // Show top 5
        };
    }, [expenses, userId]);

    return (
        <FinancePageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Overview" }]}
            header={
                <FinanceHeader
                    title={viewMode === "team" ? "Finance Overview" : "My Dashboard"}
                    subtitle={viewMode === "team" ? "Financial health dashboard and cash flow monitoring." : "Track your project expenses and approvals."}
                />
            }
        >
            {/* Removed internal div as wrapper now provides it */}
            {viewMode === "team" ? (
                <>
                    {/* TEAM SUMMARY CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <SummaryCard
                            icon={<TrendingUp className="w-5 h-5 text-green-600" />}
                            iconBg="bg-green-50"
                            label="Total Revenue"
                            value={formatShort(MOCK_TEAM_SUMMARY.totalRevenue)}
                            subtext={currentMonth}
                            trend="up"
                        />
                        <SummaryCard
                            icon={<TrendingDown className="w-5 h-5 text-red-600" />}
                            iconBg="bg-red-50"
                            label="Total Expenses"
                            value={formatShort(MOCK_TEAM_SUMMARY.totalExpenses)}
                            subtext={currentMonth}
                            trend="down"
                        />
                        <SummaryCard
                            icon={<DollarSign className="w-5 h-5 text-blue-600" />}
                            iconBg="bg-blue-50"
                            label="Net Profit"
                            value={formatShort(MOCK_TEAM_SUMMARY.netProfit)}
                            subtext="39% margin"
                        />
                        <SummaryCard
                            icon={<Wallet className="w-5 h-5 text-purple-600" />}
                            iconBg="bg-purple-50"
                            label="Cash on Hand"
                            value={formatShort(MOCK_TEAM_SUMMARY.cashOnHand)}
                            subtext="Available"
                        />
                        <SummaryCard
                            icon={<DollarSign className="w-5 h-5 text-orange-600" />}
                            iconBg="bg-orange-50"
                            label="Pending Invoices"
                            value={formatShort(MOCK_TEAM_SUMMARY.pendingInvoices)}
                            subtext="8 invoices"
                        />
                    </div>

                    {/* TWO COLUMN LAYOUT */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* PROJECT FINANCES */}
                        <div className="bg-white rounded-xl border border-neutral-200 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Building2 className="w-5 h-5 text-neutral-400" />
                                <h3 className="font-semibold text-neutral-900">Project Finances</h3>
                            </div>
                            <div>
                                {MOCK_TEAM_TOP_PROJECTS.map((project) => (
                                    <ProjectFinanceRow key={project.name} {...project} />
                                ))}
                            </div>
                        </div>

                        {/* ALERTS */}
                        <div className="bg-white rounded-xl border border-neutral-200 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="w-5 h-5 text-neutral-400" />
                                <h3 className="font-semibold text-neutral-900">Alerts</h3>
                                <span className="ml-auto text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                                    {MOCK_TEAM_ALERTS.length} active
                                </span>
                            </div>
                            <div className="space-y-3">
                                {MOCK_TEAM_ALERTS.map((alert, idx) => (
                                    <AlertItem key={idx} {...alert} />
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* PERSONAL SUMMARY (Calculated from Real Data + Mock Budget) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryCard
                            icon={<Building2 className="w-5 h-5 text-blue-600" />}
                            iconBg="bg-blue-50"
                            label="My Projects"
                            value={String(personalSummary.myProjects)}
                            subtext="Active projects"
                        />
                        <SummaryCard
                            icon={<DollarSign className="w-5 h-5 text-red-600" />}
                            iconBg="bg-red-50"
                            label="My Expenses"
                            value={formatShort(personalSummary.totalExpense)}
                            subtext="Total requested"
                        />
                        <SummaryCard
                            icon={<Clock className="w-5 h-5 text-orange-600" />}
                            iconBg="bg-orange-50"
                            label="Pending Approval"
                            value={formatShort(personalSummary.pendingApproval)}
                            subtext={`${personalSummary.pendingCount} items waiting`}
                        />
                        <SummaryCard
                            icon={<Wallet className="w-5 h-5 text-green-600" />}
                            iconBg="bg-green-50"
                            label="Remaining Budget"
                            value={formatShort(personalSummary.totalBudget - personalSummary.usedBudget)} // Mock
                            subtext="From allocated budget"
                        />
                    </div>

                    {/* PERSONAL VIEW CONTENT */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* MY RECENT EXPENSES */}
                        <div className="bg-white rounded-xl border border-neutral-200 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <DollarSign className="w-5 h-5 text-neutral-400" />
                                <h3 className="font-semibold text-neutral-900">My Recent Expenses</h3>
                            </div>
                            <div>
                                {recentExpenses.length > 0 ? recentExpenses.map((expense) => (
                                    <PersonalExpenseRow
                                        key={expense.id}
                                        date={expense.date}
                                        // @ts-ignore
                                        project={expense.project?.name || "Unknown"}
                                        type={expense.category || "General"}
                                        amount={Number(expense.amount)}
                                        status={expense.status}
                                    />
                                )) : <p className="text-neutral-500 text-sm">No recent expenses found.</p>}
                            </div>
                        </div>

                        {/* BUDGET USAGE (Mock for now) */}
                        <div className="bg-white rounded-xl border border-neutral-200 p-6">
                            <h3 className="font-semibold text-neutral-900 mb-4">Budget Utilization</h3>
                            <div className="space-y-4">
                                <p className="text-sm text-neutral-500">Visualization of budget usage per project would go here.</p>
                                {/* Placeholder */}
                                <div className="w-full h-4 bg-neutral-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[65%]" />
                                </div>
                                <div className="flex justify-between text-xs text-neutral-500">
                                    <span>Used: 65%</span>
                                    <span>Limit: 100%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

        </FinancePageWrapper >
    );
}
