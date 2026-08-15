"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { ChevronLeft, FileText, Plus } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

type TabId = "presets" | "documents";

const TABS = [
    { id: "presets" as TabId, label: "Report Presets" },
    { id: "documents" as TabId, label: "Document Templates" },
];

export default function ReportsSettingsPage() {
    const [activeTab, setActiveTab] = useState<TabId>("presets");

    return (
        <div className="min-h-screen bg-transparent px-5 md:px-0 py-6 md:py-0">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Projects" }, { label: "Settings", href: "/flow/projects/settings" }, { label: "Reports" }]} />
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
                            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Reports</h1>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Report presets and document templates</p>
                        </div>
                    </div>

                    {/* Tabs - Pill Style */}
                    <div className="flex items-center gap-2 overflow-x-auto">
                        <div className="flex gap-2 p-1 bg-neutral-100 dark:bg-neutral-800/40 rounded-full w-fit">
                            {TABS.map((tab) => {
                                const active = activeTab === tab.id;
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
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-4">
                        {activeTab === "presets" && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Configure report presets for cost/progress/summary</p>
                                    <Button icon={<Plus className="w-4 h-4" />} className="bg-brand-red hover:bg-brand-red-hover text-white w-fit">Add Preset</Button>
                                </div>
                                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/60 dark:border-neutral-850 p-12 text-center text-neutral-400 dark:text-neutral-500 shadow-sm">
                                    Report presets coming soon...
                                </div>
                            </div>
                        )}
                        {activeTab === "documents" && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Configure document templates with naming conventions</p>
                                    <Button icon={<Plus className="w-4 h-4" />} className="bg-brand-red hover:bg-brand-red-hover text-white w-fit">Add Template</Button>
                                </div>
                                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/60 dark:border-neutral-850 p-12 text-center text-neutral-400 dark:text-neutral-500 shadow-sm">
                                    Document templates coming soon...
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
