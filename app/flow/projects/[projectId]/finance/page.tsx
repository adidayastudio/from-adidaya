"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import FinanceOverviewClient from "@/components/flow/finance/FinanceOverviewClient";
import PurchasingClient from "@/components/flow/finance/PurchasingClient";
import ReimburseClient from "@/components/flow/finance/ReimburseClient";
import PettyCashClient from "@/components/flow/finance/PettyCashClient";
import ReportsClient from "@/components/flow/finance/ReportsClient";
import { FinanceProvider } from "@/components/flow/finance/FinanceContext";
import StandardPageWrapper from "@/components/layout/StandardPageWrapper";
import clsx from "clsx";
import { LayoutDashboard, ShoppingCart, Receipt, Wallet, BarChart } from "lucide-react";

export default function ProjectFinancePage() {
    const params = useParams();
    const projectId = params.projectId as string;
    const [activeTab, setActiveTab] = useState("overview");

    const tabs = [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "purchasing", label: "Purchasing", icon: ShoppingCart },
        { id: "reimburse", label: "Reimburse", icon: Receipt },
        { id: "petty-cash", label: "Petty Cash", icon: Wallet },
        { id: "reports", label: "Reports", icon: BarChart },
    ];

    return (
        <FinanceProvider>
            <StandardPageWrapper
                breadcrumbItems={[
                    { label: "Projects", href: "/flow/projects" },
                    { label: "Project Detail", href: `/project/${projectId}` },
                    { label: "Finance" }
                ]}
            >
                <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
                    {/* Tab Navigation */}
                    <div className="flex items-center gap-2 border-b border-neutral-200 pb-3 overflow-x-auto no-scrollbar">
                        {tabs.map((tab) => {
                            const active = activeTab === tab.id;
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={clsx(
                                        "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-semibold select-none shrink-0",
                                        active
                                            ? "bg-white text-neutral-900 shadow-sm border border-neutral-200"
                                            : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Contents */}
                    <div className="bg-transparent">
                        {activeTab === "overview" && <FinanceOverviewClient />}
                        {activeTab === "purchasing" && <PurchasingClient />}
                        {activeTab === "reimburse" && <ReimburseClient />}
                        {activeTab === "petty-cash" && <PettyCashClient />}
                        {activeTab === "reports" && <ReportsClient />}
                    </div>
                </div>
            </StandardPageWrapper>
        </FinanceProvider>
    );
}
