"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { ArrowLeft, Clock } from "lucide-react";
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
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Projects" }, { label: "Settings", href: "/flow/projects/settings" }, { label: "Time System" }]} />
            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full">
                    <div className="flex items-center gap-4">
                        <Link href="/flow/projects/settings"><Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>Back</Button></Link>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center"><Clock className="w-5 h-5 text-neutral-600" /></div>
                            <div><h1 className="text-2xl font-bold text-neutral-900">Time System</h1><p className="text-sm text-neutral-500">Schedule templates and progress rules</p></div>
                        </div>
                    </div>

                    <div className="border-b border-neutral-200">
                        <div className="flex gap-6">
                            {TABS.map((tab) => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={clsx("px-1 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === tab.id ? "border-red-500 text-red-600" : "border-transparent text-neutral-500 hover:text-neutral-700")}>{tab.label}</button>
                            ))}
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
