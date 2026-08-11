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
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { useProject } from "@/components/flow/project-context";
import { mapProjectToHeader } from "@/lib/flow/mappers/project-header";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import clsx from "clsx";
import { LayoutDashboard, ShoppingCart, Receipt, Wallet, BarChart } from "lucide-react";

export default function ProjectFinancePage() {
    const params = useParams();
    const projectId = (params?.projectId || params?.id) as string;
    const { project, isLoading, error } = useProject();
    const [activeTab, setActiveTab] = useState("overview");

    const tabs = [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "purchasing", label: "Purchasing", icon: ShoppingCart },
        { id: "reimburse", label: "Reimburse", icon: Receipt },
        { id: "petty-cash", label: "Petty Cash", icon: Wallet },
        { id: "reports", label: "Reports", icon: BarChart },
    ];

    if (isLoading) {
        return <GlobalLoading />;
    }

    if (error || !project) {
        return (
            <div className="flex h-screen items-center justify-center bg-neutral-50 text-neutral-500">
                {error || "Project not found."}
            </div>
        );
    }

    const projectForHeader = mapProjectToHeader(project);
    const breadcrumbLabel = `${project.project_number} - ${project.project_code} - ${project.project_name}`;

    return (
        <FinanceProvider>
            <StandardPageWrapper
                breadcrumbItems={[
                    { label: "Flow" },
                    { label: "Projects", href: "/flow/projects" },
                    { label: breadcrumbLabel, href: `/project/${project.project_code}` },
                    { label: "Finance" }
                ]}
                sidebar={<ProjectDetailSidebar />}
                isTransparent
            >
                <div className="space-y-8 max-w-4xl mx-auto px-4 lg:px-0 animate-in fade-in duration-500">
                    <ProjectDetailHeader project={projectForHeader as any} />

                    <div className="space-y-6">
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
                </div>
            </StandardPageWrapper>
        </FinanceProvider>
    );
}
