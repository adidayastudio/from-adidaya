"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import FinanceSidebar from "@/components/flow/finance/FinanceSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Building2, AlertTriangle, User, Users } from "lucide-react";
import clsx from "clsx";

// Mock Data - TEAM VIEW
const MOCK_TEAM_SUMMARY = {
    totalRevenue: 850000000,
    totalExpenses: 520000000,
    netProfit: 330000000,
    pendingInvoices: 125000000,
    cashOnHand: 275000000,
};

const MOCK_TEAM_CASH_FLOW = [
    { month: "Oct", inflow: 180, outflow: 120 },
    { month: "Nov", inflow: 220, outflow: 150 },
    { month: "Dec", inflow: 280, outflow: 180 },
    { month: "Jan", inflow: 250, outflow: 170 },
];

const MOCK_TEAM_TOP_PROJECTS = [
    { name: "Rumah Pak Budi - Kemang", revenue: 180000000, expenses: 95000000 },
    { name: "Renovasi Kantor ABC", revenue: 150000000, expenses: 85000000 },
    { name: "Villa Puncak Project", revenue: 120000000, expenses: 78000000 },
];

const MOCK_TEAM_ALERTS = [
    { type: "warning", title: "Overdue Invoice", message: "Invoice #INV-2024-089 is 15 days overdue" },
    { type: "info", title: "Payment Due", message: "Rp 45,000,000 payment due in 3 days" },
];

// Mock Data - PERSONAL VIEW
const MOCK_PERSONAL_SUMMARY = {
    myProjects: 3,
    totalBudget: 450000000,
    usedBudget: 285000000,
    pendingApprovals: 5,
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
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

export default function FinanceOverviewPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Finance" }, { label: "Overview" }]} />

            <PageWrapper sidebar={<FinanceSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    {/* HEADER */}
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Finance Overview</h1>
                                <p className="text-sm text-neutral-500 mt-1">Financial health dashboard and cash flow monitoring.</p>
                            </div>

                            {/* VIEW MODE TOGGLE */}
                            <div className="flex items-center bg-neutral-100 rounded-full p-1 self-start md:self-auto">
                                <button
                                    onClick={() => setViewMode("personal")}
                                    className={clsx(
                                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                                        viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                                    )}
                                >
                                    <User className="w-4 h-4" /> Personal
                                </button>
                                <button
                                    onClick={() => setViewMode("team")}
                                    className={clsx(
                                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                                        viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                                    )}
                                >
                                    <Users className="w-4 h-4" /> Team
                                </button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

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
                            {/* PERSONAL SUMMARY */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <SummaryCard
                                    icon={<Building2 className="w-5 h-5 text-blue-600" />}
                                    iconBg="bg-blue-50"
                                    label="My Projects"
                                    value={String(MOCK_PERSONAL_SUMMARY.myProjects)}
                                    subtext="Active projects"
                                />
                                <SummaryCard
                                    icon={<Wallet className="w-5 h-5 text-green-600" />}
                                    iconBg="bg-green-50"
                                    label="Total Budget"
                                    value={formatShort(MOCK_PERSONAL_SUMMARY.totalBudget)}
                                    subtext="Across projects"
                                />
                                <SummaryCard
                                    icon={<DollarSign className="w-5 h-5 text-orange-600" />}
                                    iconBg="bg-orange-50"
                                    label="Used Budget"
                                    value={formatShort(MOCK_PERSONAL_SUMMARY.usedBudget)}
                                    subtext={`${((MOCK_PERSONAL_SUMMARY.usedBudget / MOCK_PERSONAL_SUMMARY.totalBudget) * 100).toFixed(0)}% utilized`}
                                />
                                <SummaryCard
                                    icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
                                    iconBg="bg-red-50"
                                    label="Pending Approvals"
                                    value={String(MOCK_PERSONAL_SUMMARY.pendingApprovals)}
                                    subtext="Needs attention"
                                />
                            </div>

                            {/* MY PROJECT BUDGETS */}
                            <div className="bg-white rounded-xl border border-neutral-200 p-6">
                                <h3 className="font-semibold text-neutral-900 mb-4">My Project Budgets</h3>
                                <div className="space-y-4">
                                    {MOCK_TEAM_TOP_PROJECTS.slice(0, 3).map((project, idx) => (
                                        <div key={idx} className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <div className="font-medium text-neutral-900">{project.name}</div>
                                                <div className="w-full h-2 bg-neutral-100 rounded-full mt-2 overflow-hidden">
                                                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${(project.expenses / project.revenue) * 100}%` }} />
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-neutral-900">{formatShort(project.expenses)}</div>
                                                <div className="text-xs text-neutral-500">of {formatShort(project.revenue)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </PageWrapper>
        </div>
    );
}
