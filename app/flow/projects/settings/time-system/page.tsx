"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { ChevronLeft, Clock } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import ScheduleSystem from "@/components/flow/projects/settings/time-system/ScheduleSystem";

type TabId = "schedule" | "progress";

const TABS = [
    { id: "schedule" as TabId, label: "Schedule Templates" },
    { id: "progress" as TabId, label: "Progress Rules" },
];

export default function TimeSystemPage() {
    const [activeTab, setActiveTab] = useState<TabId>("schedule");

    return (
        <div className="min-h-screen bg-transparent px-5 md:px-0 py-6 md:py-0">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Projects" }, { label: "Settings", href: "/flow/projects/settings" }, { label: "Time System" }]} />
            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full">
                    {/* Header */}
                    <div className="flex flex-col gap-2">
                        <Link href="/project/settings" className="lg:hidden w-fit">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-neutral-900 shadow-sm border border-black/[0.03] dark:border-white/[0.05] active:scale-90 transition-all">
                                <ChevronLeft className="w-5 h-5 text-neutral-700 dark:text-white" strokeWidth={1.5} />
                            </div>
                        </Link>
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Time System</h1>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Schedule templates and progress rules</p>
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

                    <div>
                        {activeTab === "schedule" && (
                            <ScheduleSystem />
                        )}
                        {activeTab === "progress" && (
                            <div className="space-y-4">
                                <p className="text-sm text-neutral-600">Configure progress weighting and S-curve</p>
                                <div className="bg-white rounded-xl border p-8 text-center text-neutral-400">Progress rules coming soon...</div>
                            </div>
                        )}
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
