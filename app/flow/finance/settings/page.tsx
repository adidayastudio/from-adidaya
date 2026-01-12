"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import FinanceSidebar from "@/components/flow/finance/FinanceSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Workflow, CreditCard, FileText, Shield, ChevronRight, Building2 } from "lucide-react";
import clsx from "clsx";

function SettingCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick?: () => void }) {
    return (
        <button onClick={onClick} className="flex items-center gap-4 p-5 bg-white rounded-xl border border-neutral-200 hover:border-red-200 hover:shadow-sm transition-all text-left w-full group">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                {icon}
            </div>
            <div className="flex-1">
                <div className="font-semibold text-neutral-900">{title}</div>
                <div className="text-sm text-neutral-500 mt-0.5">{description}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-neutral-400" />
        </button>
    );
}

export default function FinanceSettingsPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Finance" }, { label: "Settings" }]} />

            <PageWrapper sidebar={<FinanceSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    {/* HEADER */}
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
                                <p className="text-sm text-neutral-500 mt-1">Configure finance system settings.</p>
                            </div>

                            <div className="flex items-center bg-neutral-100 rounded-full p-1 self-start md:self-auto">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}>
                                    <User className="w-4 h-4" /> Personal
                                </button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}>
                                    <Users className="w-4 h-4" /> Team
                                </button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    {/* SETTINGS CONTENT */}
                    {viewMode === "team" ? (
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Team Settings</h3>
                            <div className="grid gap-4">
                                <SettingCard icon={<Workflow className="w-5 h-5" />} title="Payment Approval Flow" description="Configure approval workflow for payments" />
                                <SettingCard icon={<FileText className="w-5 h-5" />} title="Invoice Templates" description="Manage invoice templates and numbering" />
                                <SettingCard icon={<CreditCard className="w-5 h-5" />} title="Bank Accounts" description="Configure company bank accounts" />
                                <SettingCard icon={<Building2 className="w-5 h-5" />} title="Tax Settings" description="VAT and tax configuration" />
                                <SettingCard icon={<Shield className="w-5 h-5" />} title="Permissions" description="Role-based access control for finance module" />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Personal Preferences</h3>
                            <div className="grid gap-4">
                                <SettingCard icon={<FileText className="w-5 h-5" />} title="Report Preferences" description="Configure your default report views" />
                                <SettingCard icon={<CreditCard className="w-5 h-5" />} title="Notification Settings" description="Payment and invoice alerts" />
                            </div>

                            <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <div className="text-sm text-blue-700">
                                    <strong>Note:</strong> Team-wide settings are managed by your administrator.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </PageWrapper>
        </div>
    );
}
