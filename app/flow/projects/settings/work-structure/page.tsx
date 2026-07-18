"use client";

import { useState, useEffect } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { ChevronLeft, FolderTree, Gauge, BarChart3, ListTree } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchProjectTypes, ProjectTypeTemplate, fetchDefaultWorkspaceId } from "@/lib/api/templates";
import clsx from "clsx";

// Tabs
import BallparkTab from "./tabs/BallparkTab";
import EstimatesTab from "./tabs/EstimatesTab";
import DetailTab from "./tabs/DetailTab";

type TabId = "ballpark" | "estimates" | "detail";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
    { id: "ballpark", label: "Ballpark", icon: Gauge, description: "L1-2 Hierarchy. Used for rapid 'Quick Quote' estimation before design." },
    { id: "estimates", label: "Estimates", icon: BarChart3, description: "L3 Hierarchy. Primary structure for detailed quantitiy take-offs." },
    { id: "detail", label: "Detail", icon: ListTree, description: "L4-5 Hierarchy. Granular item dictionary for complex breakdown." },
];

export default function WorkStructurePage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabId>("ballpark");
    const [selectedTypeId, setSelectedTypeId] = useState<string>("");
    const [projectTypes, setProjectTypes] = useState<ProjectTypeTemplate[]>([]);
    const [workspaceId, setWorkspaceId] = useState("");

    useEffect(() => {
        const init = async () => {
            const wsId = await fetchDefaultWorkspaceId();
            if (wsId) {
                setWorkspaceId(wsId);
                const types = await fetchProjectTypes(wsId);
                setProjectTypes(types);

                const dnb = types.find(t => t.code === "DNB" || (t.name.toLowerCase().includes("design") && t.name.toLowerCase().includes("build")));
                const bld = types.find(t => t.code === "BLD" || (t.name.toLowerCase().includes("build") && !t.name.toLowerCase().includes("design")));

                if (dnb) setSelectedTypeId(dnb.projectTypeId);
                else if (bld) setSelectedTypeId(bld.projectTypeId);
                else if (types.length > 0) setSelectedTypeId(types[0].projectTypeId);
            }
        };
        init();
    }, []);

    const activeTabData = TABS.find(t => t.id === activeTab) || TABS[0];

    return (
        <div className="min-h-screen bg-transparent px-5 md:px-0 py-6 md:py-0">
            <Breadcrumb items={[
                { label: "Flow" },
                { label: "Projects" },
                { label: "Settings", href: "/flow/projects/settings" },
                { label: "Work Structure" }
            ]} />

            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full animate-in fade-in duration-500">

                    {/* Header */}
                    <div className="flex flex-col gap-2">
                        <Link href="/project/settings" className="lg:hidden w-fit">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-neutral-900 shadow-sm border border-black/[0.03] dark:border-white/[0.05] active:scale-90 transition-all">
                                <ChevronLeft className="w-5 h-5 text-neutral-700 dark:text-white" strokeWidth={1.5} />
                            </div>
                        </Link>
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Work Structure</h1>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Configure work breakdown structure templates</p>
                        </div>
                    </div>

                    {/* Tabs - Pill Style */}
                    <div className="flex items-center gap-2 overflow-x-auto">
                        <div className="flex gap-2 p-1 bg-neutral-100 dark:bg-neutral-800/40 rounded-full w-fit">
                            {TABS.map((tab) => {
                                const active = activeTab === tab.id;
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={clsx(
                                            "flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all",
                                            active
                                                ? "bg-brand-red text-white shadow-sm"
                                                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-white/50 dark:hover:bg-neutral-800/60"
                                        )}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab Header Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-neutral-900">{activeTabData.label}</h2>
                            <p className="text-sm text-neutral-500">{activeTabData.description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Project type switcher or other controls */}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="animate-in fade-in duration-300">
                        {!selectedTypeId ? (
                            <div className="p-12 text-center text-neutral-500">Loading project types...</div>
                        ) : (
                            <>
                                {activeTab === "ballpark" && (
                                    <BallparkTab
                                        workspaceId={workspaceId}
                                        projectTypeId={selectedTypeId}
                                    />
                                )}
                                {activeTab === "estimates" && (
                                    <EstimatesTab
                                        workspaceId={workspaceId}
                                        projectTypeId={selectedTypeId}
                                    />
                                )}
                                {activeTab === "detail" && (
                                    <DetailTab
                                        workspaceId={workspaceId}
                                        projectTypeId={selectedTypeId}
                                    />
                                )}
                            </>
                        )}
                    </div>

                </div>
            </PageWrapper>
        </div>
    );
}
