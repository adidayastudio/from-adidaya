"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, GitBranch, ListOrdered, Target, CheckSquare } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { useRouter } from "next/navigation";
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

type TabId = "list" | "scope" | "tasks";

const TABS: { id: TabId; label: string; icon: React.ReactNode; description: string }[] = [
    { id: "list", label: "Stage List", icon: <ListOrdered className="w-4 h-4" />, description: "Master sequence of project phases. Determines default workflow." },
    { id: "scope", label: "Scope Stages", icon: <Target className="w-4 h-4" />, description: "Map stages to Scopes. Defines which stages appear for each project type." },
    { id: "tasks", label: "Task Templates", icon: <CheckSquare className="w-4 h-4" />, description: "Standard deliverables per stage. Auto-populates task lists on stage start." },
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
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[
                { label: "Flow" },
                { label: "Projects" },
                { label: "Settings", href: "/flow/projects/settings" },
                { label: "Stages" }
            ]} />

            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full animate-in fade-in duration-500">

                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Button
                            variant="secondary"
                            icon={<ArrowLeft className="w-4 h-4" />}
                            onClick={() => router.push('/flow/projects/settings')}
                        >
                            Back
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                                <GitBranch className="w-5 h-5 text-neutral-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Stages</h1>
                                <p className="text-sm text-neutral-500">Configure project stages, definitions, and rules</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs - Underline Style */}
                    <div className="overflow-x-auto">
                        <div className="flex gap-1 min-w-max">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={clsx(
                                        "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                                        activeTab === tab.id
                                            ? "border-brand-red text-brand-red"
                                            : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                                    )}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
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
                            </>
                        )}
                    </div>

                </div>
            </PageWrapper>
        </div>
    );
}
