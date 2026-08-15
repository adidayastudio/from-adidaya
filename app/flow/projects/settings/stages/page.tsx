"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, GitBranch, ListOrdered, Target, CheckSquare, FileText } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchProjectTypes, ProjectTypeTemplate, fetchDefaultWorkspaceId } from "@/lib/api/templates";
import clsx from "clsx";

// Layout Imports
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";

// Tabs
import StageListTab from "./tabs/StageListTab";
import StageScopeTab from "./tabs/StageScopeTab";
import StageTasksTab from "./tabs/StageTasksTab";
import StageDocumentTab from "./tabs/StageDocumentTab";
import StageContentTemplateTab from "./tabs/StageContentTemplateTab";
import { Layout } from "lucide-react";

type TabId = "list" | "scope" | "tasks" | "document" | "content";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
    { id: "list", label: "Stage List", icon: ListOrdered, description: "Master sequence of project phases. Determines default workflow." },
    { id: "scope", label: "Scope Stages", icon: Target, description: "Map stages to Scopes. Defines which stages appear for each project type." },
    { id: "tasks", label: "Task Templates", icon: CheckSquare, description: "Standard deliverables per stage. Auto-populates task lists on stage start." },
    { id: "document", label: "Document Template", icon: FileText, description: "Configure document page templates per stage. Defines default content for auto-generated reports." },
    { id: "content", label: "Content Template", icon: Layout, description: "Reusable page content block library. Pick presets to restore or build pages." },
];

export default function StagesPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabId>("list");
    const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);
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
                { label: "Stages" }
            ]} />

            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full max-w-4xl mx-auto animate-in fade-in duration-500">

                    {/* Header */}
                    <div className="flex flex-col gap-2">
                        <Link href="/project/settings" className="lg:hidden w-fit">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-neutral-900 shadow-sm border border-black/[0.03] dark:border-white/[0.05] active:scale-90 transition-all">
                                <ChevronLeft className="w-5 h-5 text-neutral-700 dark:text-white" strokeWidth={1.5} />
                            </div>
                        </Link>
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Stages</h1>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Configure project stages, definitions, and rules</p>
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
                    <div className="flex items-center justify-between gap-4 h-auto py-4">
                        <div className="flex flex-col items-start gap-1">
                            <h2 className="text-lg font-bold text-neutral-900 leading-tight">{activeTabData.label}</h2>
                            <p className="text-sm text-neutral-500 leading-tight">{activeTabData.description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {headerActions}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="animate-in fade-in duration-300">
                        {!selectedTypeId ? (
                            <div className="p-12 text-center text-neutral-500">Loading scope types...</div>
                        ) : (
                            <>
                                {activeTab === "list" && (
                                    <StageListTab
                                        workspaceId={workspaceId}
                                        projectTypeId={selectedTypeId}
                                        setHeaderActions={setHeaderActions}
                                    />
                                )}
                                {activeTab === "scope" && (
                                    <StageScopeTab
                                        workspaceId={workspaceId}
                                        setHeaderActions={setHeaderActions}
                                    />
                                )}
                                {activeTab === "tasks" && (
                                    <StageTasksTab
                                        workspaceId={workspaceId}
                                        projectTypeId={selectedTypeId}
                                        setHeaderActions={setHeaderActions}
                                    />
                                )}
                                {activeTab === "document" && (
                                    <StageDocumentTab
                                        workspaceId={workspaceId}
                                        projectTypeId={selectedTypeId}
                                        setHeaderActions={setHeaderActions}
                                    />
                                )}
                                {activeTab === "content" && (
                                    <StageContentTemplateTab
                                        workspaceId={workspaceId}
                                        projectTypeId={selectedTypeId}
                                        setHeaderActions={setHeaderActions}
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
