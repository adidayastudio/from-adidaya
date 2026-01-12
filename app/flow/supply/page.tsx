"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import SupplySidebar from "@/components/flow/supply/SupplySidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Package, Truck, FileSignature, Clock, CheckCircle, AlertTriangle, Building2, User, Users } from "lucide-react";
import clsx from "clsx";

// Mock Data - TEAM VIEW
const MOCK_TEAM_SUMMARY = {
    totalOrders: 24,
    pendingOrders: 8,
    inTransit: 5,
    delivered: 11,
    totalValue: 185000000,
};

const MOCK_TEAM_RECENT_ORDERS = [
    { id: "PO-2025-024", vendor: "PT Baja Steel", project: "Rumah Pak Budi", amount: 45000000, status: "In Transit" },
    { id: "PO-2025-023", vendor: "CV Kayu Prima", project: "Villa Puncak", amount: 28000000, status: "Pending" },
    { id: "PO-2025-022", vendor: "PT Semen Jaya", project: "Renovasi Kantor", amount: 15000000, status: "Delivered" },
];

const MOCK_TEAM_ALERTS = [
    { type: "warning", title: "Delayed Delivery", message: "PO-2025-020 is 3 days overdue" },
    { type: "info", title: "Low Stock Alert", message: "Steel rebar inventory running low" },
];

// Mock Data - PERSONAL VIEW
const MOCK_PERSONAL_SUMMARY = {
    myRequests: 5,
    approved: 3,
    pending: 2,
    totalValue: 12500000,
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatShort(amount: number) {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(0)}M`;
    return formatCurrency(amount);
}

function SummaryCard({ icon, iconBg, label, value, subtext }: { icon: React.ReactNode; iconBg: string; label: string; value: string; subtext?: string }) {
    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-red-200 transition-colors group">
            <div className="flex items-start justify-between mb-3">
                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>{icon}</div>
            </div>
            <div className="text-sm font-medium text-neutral-500 mb-1">{label}</div>
            <div className="text-2xl font-bold text-neutral-900 tracking-tight">{value}</div>
            {subtext && <div className="text-xs text-neutral-400 mt-1">{subtext}</div>}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        Pending: "bg-orange-50 text-orange-700",
        "In Transit": "bg-blue-50 text-blue-700",
        Delivered: "bg-green-50 text-green-700",
    };
    return <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", colors[status])}>{status}</span>;
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

export default function SupplyOverviewPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Supply" }, { label: "Overview" }]} />

            <PageWrapper sidebar={<SupplySidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    {/* HEADER */}
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Supply Overview</h1>
                                <p className="text-sm text-neutral-500 mt-1">Track purchase orders, vendors, and deliveries.</p>
                            </div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1 self-start md:self-auto">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}>
                                    <User className="w-4 h-4" /> Personal
                                </button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}>
                                    <Users className="w-4 h-4" /> Team
                                </button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    {viewMode === "team" ? (
                        <>
                            {/* TEAM SUMMARY */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <SummaryCard icon={<FileSignature className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-50" label="Total Orders" value={String(MOCK_TEAM_SUMMARY.totalOrders)} subtext="This month" />
                                <SummaryCard icon={<Clock className="w-5 h-5 text-orange-600" />} iconBg="bg-orange-50" label="Pending" value={String(MOCK_TEAM_SUMMARY.pendingOrders)} subtext="Awaiting approval" />
                                <SummaryCard icon={<Truck className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-50" label="In Transit" value={String(MOCK_TEAM_SUMMARY.inTransit)} subtext="On the way" />
                                <SummaryCard icon={<CheckCircle className="w-5 h-5 text-green-600" />} iconBg="bg-green-50" label="Delivered" value={String(MOCK_TEAM_SUMMARY.delivered)} subtext="Completed" />
                                <SummaryCard icon={<Package className="w-5 h-5 text-red-600" />} iconBg="bg-red-50" label="Total Value" value={formatShort(MOCK_TEAM_SUMMARY.totalValue)} subtext="All orders" />
                            </div>

                            {/* TWO COLUMNS */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* RECENT ORDERS */}
                                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <FileSignature className="w-5 h-5 text-neutral-400" />
                                        <h3 className="font-semibold text-neutral-900">Recent Orders</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {MOCK_TEAM_RECENT_ORDERS.map((order) => (
                                            <div key={order.id} className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
                                                <div>
                                                    <div className="font-medium text-neutral-900">{order.id}</div>
                                                    <div className="text-sm text-neutral-500">{order.vendor} · {order.project}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-medium text-neutral-900">{formatShort(order.amount)}</div>
                                                    <StatusBadge status={order.status} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ALERTS */}
                                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <AlertTriangle className="w-5 h-5 text-neutral-400" />
                                        <h3 className="font-semibold text-neutral-900">Alerts</h3>
                                        <span className="ml-auto text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">{MOCK_TEAM_ALERTS.length} active</span>
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
                                <SummaryCard icon={<FileSignature className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-50" label="My Requests" value={String(MOCK_PERSONAL_SUMMARY.myRequests)} subtext="Total submitted" />
                                <SummaryCard icon={<CheckCircle className="w-5 h-5 text-green-600" />} iconBg="bg-green-50" label="Approved" value={String(MOCK_PERSONAL_SUMMARY.approved)} subtext="Ready to order" />
                                <SummaryCard icon={<Clock className="w-5 h-5 text-orange-600" />} iconBg="bg-orange-50" label="Pending" value={String(MOCK_PERSONAL_SUMMARY.pending)} subtext="Awaiting approval" />
                                <SummaryCard icon={<Package className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-50" label="Total Value" value={formatShort(MOCK_PERSONAL_SUMMARY.totalValue)} subtext="My requests" />
                            </div>

                            {/* MY RECENT REQUESTS */}
                            <div className="bg-white rounded-xl border border-neutral-200 p-6">
                                <h3 className="font-semibold text-neutral-900 mb-4">My Recent Requests</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between py-3 border-b border-neutral-100">
                                        <div>
                                            <div className="font-medium text-neutral-900">Steel Rebar 12mm</div>
                                            <div className="text-sm text-neutral-500">Rumah Pak Budi · 2025-01-05</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium text-neutral-900">{formatShort(5500000)}</div>
                                            <StatusBadge status="Pending" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-b border-neutral-100">
                                        <div>
                                            <div className="font-medium text-neutral-900">Cement 50kg x 100</div>
                                            <div className="text-sm text-neutral-500">Villa Puncak · 2025-01-03</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium text-neutral-900">{formatShort(7000000)}</div>
                                            <StatusBadge status="Delivered" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </PageWrapper>
        </div>
    );
}
