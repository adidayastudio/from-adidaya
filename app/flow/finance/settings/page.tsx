"use client";

import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import { useFinance } from "@/components/flow/finance/FinanceContext";
import { Workflow, CreditCard, FileText, Shield, ChevronRight, Building2 } from "lucide-react";

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

import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";

export default function FinanceSettingsPage() {
    const { viewMode } = useFinance();

    return (
        <FinancePageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Settings" }]}
            header={
                <FinanceHeader
                    title="Settings"
                    subtitle="Configure finance system settings."
                />
            }
        >
            <div className="space-y-8 w-full animate-in fade-in duration-500">
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
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-neutral-200">
                        <p className="text-neutral-500">Finance Settings are available in Team View only.</p>
                        <p className="text-xs text-neutral-400 mt-2">Please switch to Team View if you have access.</p>
                    </div>
                )}
            </div>
        </FinancePageWrapper>
    );
}
