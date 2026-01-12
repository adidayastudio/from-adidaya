"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import AssetSidebar from "@/components/flow/asset/AssetSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Workflow, Tag, TrendingDown, Shield, ChevronRight } from "lucide-react";
import clsx from "clsx";

function SettingCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <button className="flex items-center gap-4 p-5 bg-white rounded-xl border hover:border-red-200 hover:shadow-sm transition-all text-left w-full group">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500 group-hover:bg-red-50 group-hover:text-red-600">{icon}</div>
            <div className="flex-1"><div className="font-semibold text-neutral-900">{title}</div><div className="text-sm text-neutral-500">{description}</div></div>
            <ChevronRight className="w-5 h-5 text-neutral-300" />
        </button>
    );
}

export default function AssetSettingsPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Asset" }, { label: "Settings" }]} />
            <PageWrapper sidebar={<AssetSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
                                <p className="text-sm text-neutral-500 mt-1">Configure asset management settings.</p>
                            </div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>
                    {viewMode === "team" ? (
                        <div className="grid gap-4">
                            <SettingCard icon={<Tag className="w-5 h-5" />} title="Asset Categories" description="Manage asset types and categories" />
                            <SettingCard icon={<Workflow className="w-5 h-5" />} title="Allocation Workflow" description="Configure asset assignment process" />
                            <SettingCard icon={<TrendingDown className="w-5 h-5" />} title="Depreciation Rules" description="Set depreciation methods and rates" />
                            <SettingCard icon={<Shield className="w-5 h-5" />} title="Permissions" description="Role-based access control" />
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            <SettingCard icon={<Tag className="w-5 h-5" />} title="My Preferences" description="Asset notification settings" />
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700"><strong>Note:</strong> Team settings managed by admin.</div>
                        </div>
                    )}
                </div>
            </PageWrapper>
        </div>
    );
}
