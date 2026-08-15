"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { ChevronLeft, Settings, Plus, Briefcase, Building, Users, Layers } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

// Import tab components
import ScopeTypesTab from "./tabs/ScopeTypesTab";
import TypologiesTab from "./tabs/TypologiesTab";
import DisciplinesTab from "./tabs/DisciplinesTab";
import ClassesTab from "./tabs/ClassesTab";

type TabId = "scope" | "typology" | "discipline" | "class";

interface Tab {
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    component: React.ComponentType<{ isOpen: boolean; onClose: () => void }>;
}

const TABS: Tab[] = [
    { id: "scope", label: "Scope", icon: Briefcase, component: ScopeTypesTab },
    { id: "typology", label: "Typology", icon: Building, component: TypologiesTab },
    { id: "discipline", label: "Discipline", icon: Users, component: DisciplinesTab },
    { id: "class", label: "Class", icon: Layers, component: ClassesTab }
];

export default function GeneralSettingsPage() {
    const [activeTab, setActiveTab] = useState<TabId>("scope");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const activeTabData = TABS.find((t) => t.id === activeTab) || TABS[0];
    const ActiveComponent = activeTabData.component;

    return (
        <div className="min-h-screen bg-transparent px-5 md:px-0 py-6 md:py-0">
            <Breadcrumb items={[
                { label: "Flow" },
                { label: "Projects" },
                { label: "Settings", href: "/flow/projects/settings" },
                { label: "General" }
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
                            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">General</h1>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Configure scopes, typologies, disciplines, and classes</p>
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
                                        onClick={() => { setActiveTab(tab.id); setIsModalOpen(false); }}
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
