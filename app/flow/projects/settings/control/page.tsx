"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { ChevronLeft, Shield, Plus } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

type TabId = "roles" | "change";

const TABS = [
    { id: "roles" as TabId, label: "Roles & Permissions" },
    { id: "change" as TabId, label: "Change Management" },
];

export default function ControlSettingsPage() {
    const [activeTab, setActiveTab] = useState<TabId>("roles");

    return (
        <div className="min-h-screen bg-transparent px-5 md:px-0 py-6 md:py-0">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Projects" }, { label: "Settings", href: "/flow/projects/settings" }, { label: "Control" }]} />
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
                            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Control</h1>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Roles, permissions, and change management</p>
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
                        {activeTab === "roles" && (
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <p className="text-sm text-neutral-600">Configure role-based access control</p>
                                    <Button icon={<Plus className="w-4 h-4" />} className="bg-brand-red hover:bg-brand-red-hover text-white">Add Role</Button>
                                </div>
                                <div className="bg-white rounded-xl border p-8 text-center text-neutral-400">Roles & Permissions management coming soon...</div>
                            </div>
                        )}
                        {activeTab === "change" && (
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <p className="text-sm text-neutral-600">Configure change management workflows</p>
                                    <Button icon={<Plus className="w-4 h-4" />} className="bg-brand-red hover:bg-brand-red-hover text-white">Add Workflow</Button>
                                </div>
                                <div className="bg-white rounded-xl border p-8 text-center text-neutral-400">Change management coming soon...</div>
                            </div>
                        )}
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
