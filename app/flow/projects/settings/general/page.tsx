"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { ArrowLeft, Settings, Plus, Briefcase, Building, Users, Layers } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

// Import tab components
import ScopeTypesTab from "./tabs/ScopeTypesTab";
import TypologiesTab from "./tabs/TypologiesTab";
import DisciplinesTab from "./tabs/DisciplinesTab";
import ClassesTab from "./tabs/ClassesTab";

type TabId = "scope" | "typologies" | "disciplines" | "classes";

const TABS: { id: TabId; label: string; icon: React.ReactNode; description: string; actionLabel: string; component: any }[] = [
    { id: "scope", label: "Scope", icon: <Briefcase className="w-4 h-4" />, description: "Define delivery methods (e.g. Design-Build). Controls which Stages are active.", actionLabel: "Add Scope", component: ScopeTypesTab },
    { id: "typologies", label: "Typology", icon: <Building className="w-4 h-4" />, description: "Categorize by function. Used for benchmarking and historical cost data.", actionLabel: "Add Typology", component: TypologiesTab },
    { id: "disciplines", label: "Discipline", icon: <Users className="w-4 h-4" />, description: "Manage trades. Drag to reorder - this sequence determines global WBS sorting.", actionLabel: "Add Discipline", component: DisciplinesTab },
    { id: "classes", label: "Class", icon: <Layers className="w-4 h-4" />, description: "Define quality levels (e.g. Luxury, Standard). Sets baseline cost multipliers.", actionLabel: "Add Class", component: ClassesTab },
];

export default function GeneralSettingsPage() {
    const [activeTab, setActiveTab] = useState<TabId>("scope");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const activeTabData = TABS.find(t => t.id === activeTab) || TABS[0];
    const ActiveComponent = activeTabData.component;

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[
                { label: "Flow" },
                { label: "Projects" },
                { label: "Settings", href: "/flow/projects/settings" },
                { label: "General" }
            ]} />
            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full animate-in fade-in duration-500">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Link href="/flow/projects/settings">
                            <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
                                Back
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                                <Settings className="w-5 h-5 text-neutral-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">General</h1>
                                <p className="text-sm text-neutral-500">Configure scopes, typologies, disciplines, and classes</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs - Underline Style */}
                    <div className="border-b border-neutral-200 overflow-x-auto">
                        <div className="flex gap-1 min-w-max">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActiveTab(tab.id); setIsModalOpen(false); }}
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
                            {activeTab === 'scope' && (
                                <Link href="/flow/projects/settings/stages">
                                    <Button
                                        variant="secondary"
                                        className="!rounded-full px-6 border border-neutral-200 text-neutral-600 hover:text-neutral-900 bg-white"
                                    >
                                        Manage Stages &rarr;
                                    </Button>
                                </Link>
                            )}
                            <Button
                                icon={<Plus className="w-4 h-4" />}
                                className="bg-brand-red hover:bg-brand-red-hover text-white !rounded-full px-6"
                                onClick={() => setIsModalOpen(true)}
                            >
                                {activeTabData.actionLabel}
                            </Button>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="animate-in fade-in duration-300">
                        <ActiveComponent
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                        />
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
