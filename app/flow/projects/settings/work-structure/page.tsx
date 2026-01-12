"use client";

import { useState, useEffect } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { ArrowLeft, FolderTree, Gauge, BarChart3, ListTree } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchProjectTypes, ProjectTypeTemplate, fetchDefaultWorkspaceId } from "@/lib/api/templates";
import clsx from "clsx";

// Tabs
import BallparkTab from "./tabs/BallparkTab";
import EstimatesTab from "./tabs/EstimatesTab";
import DetailTab from "./tabs/DetailTab";

type TabId = "ballpark" | "estimates" | "detail";

const TABS: { id: TabId; label: string; icon: React.ReactNode; description: string }[] = [
    { id: "ballpark", label: "Ballpark", icon: <Gauge className="w-4 h-4" />, description: "L1-2 Hierarchy. Used for rapid 'Quick Quote' estimation before design." },
    { id: "estimates", label: "Estimates", icon: <BarChart3 className="w-4 h-4" />, description: "L3 Hierarchy. Primary structure for detailed quantitiy take-offs." },
    { id: "detail", label: "Detail", icon: <ListTree className="w-4 h-4" />, description: "L4-5 Hierarchy. Granular item dictionary for complex breakdown." },
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
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[
                { label: "Flow" },
                { label: "Projects" },
                { label: "Settings", href: "/flow/projects/settings" },
                { label: "Work Structure" }
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
                                <FolderTree className="w-5 h-5 text-neutral-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Work Structure</h1>
                                <p className="text-sm text-neutral-500">Configure work breakdown structure templates</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs - Underline Style */}
                    <div className="border-b border-neutral-200 overflow-x-auto">
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
