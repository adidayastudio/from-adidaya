"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { ArrowLeft, Shield, Plus } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

type TabId = "roles" | "change";

const TABS = [
    { id: "roles" as TabId, label: "Roles & Permissions" },
    { id: "change" as TabId, label: "Change Management" },
];

export default function ControlPage() {
    const [activeTab, setActiveTab] = useState<TabId>("roles");

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Projects" }, { label: "Settings", href: "/flow/projects/settings" }, { label: "Control" }]} />
            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full">
                    <div className="flex items-center gap-4">
                        <Link href="/flow/projects/settings"><Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>Back</Button></Link>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center"><Shield className="w-5 h-5 text-neutral-600" /></div>
                            <div><h1 className="text-2xl font-bold text-neutral-900">Control</h1><p className="text-sm text-neutral-500">Roles, permissions, and change management</p></div>
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
