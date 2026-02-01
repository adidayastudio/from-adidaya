"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { X, Save, Shield, Eye, CheckCircle2, Globe, Users, Lock, Info, Check, FastForward } from "lucide-react";
import { OrganizationRolePermission, VisibilityLevel, VisibilityScope } from "@/lib/types/organization";
import { updateRolePermissions } from "@/lib/api/people";
import { generateEffectiveAccessPreview } from "@/lib/access-utils";
import { clsx } from "clsx";

interface RuleEditorDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    role: (OrganizationRolePermission & { role_name: string, role_code: string }) | null;
    onSave: () => void;
}

export default function RuleEditorDrawer({ isOpen, onClose, role, onSave }: RuleEditorDrawerProps) {
    const [formData, setFormData] = useState<Partial<OrganizationRolePermission>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (role) {
            setFormData(role);
        }
    }, [role, isOpen]);

    if (!role) return null;

    const handleToggle = (key: keyof OrganizationRolePermission) => {
        setFormData(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSelect = (key: keyof OrganizationRolePermission, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const success = await updateRolePermissions(formData as OrganizationRolePermission);
            if (success) onSave();
        } catch (error) {
            console.error("Save failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const effectivePreview = generateEffectiveAccessPreview(role.role_name, formData);

    return (
        <div className={clsx(
            "fixed inset-0 z-[100] flex justify-end transition-opacity duration-300",
            isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />

            {/* Drawer */}
            <div className={clsx(
                "relative w-full max-w-xl bg-neutral-50 h-full shadow-2xl transition-transform duration-300 flex flex-col",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                {/* Header */}
                <div className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900 leading-none mb-1">{role.role_name} Rules</h2>
                            <p className="text-xs text-neutral-500 font-medium tracking-tight uppercase">Configuring Access Control for @{role.role_code}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-400 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">

                    {/* Capabilities */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            <h3 className="font-bold text-neutral-900 uppercase text-xs tracking-wider">Functional Capabilities</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <CapabilityToggle
                                label="View Directory"
                                description="Can browse all colleagues in the organization directory."
                                isActive={!!formData.can_view_directory}
                                onToggle={() => handleToggle('can_view_directory')}
                            />
                            <CapabilityToggle
                                label="Manage People"
                                description="Can add, edit, and deactivate user profiles."
                                isActive={!!formData.can_manage_people}
                                onToggle={() => handleToggle('can_manage_people')}
                            />
                            <CapabilityToggle
                                label="View Performance Summary"
                                description="Can see high-level KPI trends and attendance scores."
                                isActive={!!formData.can_view_performance_summary}
                                onToggle={() => handleToggle('can_view_performance_summary')}
                            />
                            <CapabilityToggle
                                label="View Performance Detail"
                                description="Access deep-dive task metrics and sensitive KPI data."
                                isActive={!!formData.can_view_performance_detail}
                                onToggle={() => handleToggle('can_view_performance_detail')}
                            />
                        </div>
                    </section>

                    {/* Data Visibility */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-indigo-600" />
                            <h3 className="font-bold text-neutral-900 uppercase text-xs tracking-wider">Data Visibility & Scope</h3>
                        </div>

                        <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-6 shadow-sm">
                            <div className="space-y-3">
                                <label className="text-[10px] uppercase font-black text-neutral-400 tracking-[0.1em]">Visibility Level</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Public', 'Internal', 'Restricted', 'Sensitive'].map((level) => (
                                        <button
                                            key={level}
                                            onClick={() => handleSelect('visibility_level', level)}
                                            className={clsx(
                                                "px-4 py-2.5 rounded-xl border text-sm font-bold transition-all",
                                                formData.visibility_level === level
                                                    ? "bg-indigo-600 border-indigo-700 text-white shadow-md shadow-indigo-100"
                                                    : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300"
                                            )}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] uppercase font-black text-neutral-400 tracking-[0.1em]">Visibility Scope</label>
                                <div className="flex bg-neutral-100 p-1.5 rounded-2xl">
                                    {['Self', 'Team', 'Global'].map((scope) => (
                                        <button
                                            key={scope}
                                            onClick={() => handleSelect('visibility_scope', scope)}
                                            className={clsx(
                                                "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                                formData.visibility_scope === scope
                                                    ? "bg-white text-blue-600 shadow-sm"
                                                    : "text-neutral-500 hover:text-neutral-700"
                                            )}
                                        >
                                            {scope === 'Global' ? <Globe className="w-3.5 h-3.5" /> :
                                                scope === 'Team' ? <Users className="w-3.5 h-3.5" /> :
                                                    <Lock className="w-3.5 h-3.5" />}
                                            {scope}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Approvals */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <FastForward className="w-4 h-4 text-orange-500" />
                            <h3 className="font-bold text-neutral-900 uppercase text-xs tracking-wider">Approval Authority</h3>
                        </div>
                        <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100 shadow-sm">
                            <ApprovalItem
                                label="Leave Requests"
                                isActive={!!formData.can_approve_leave}
                                onToggle={() => handleToggle('can_approve_leave')}
                            />
                            <ApprovalItem
                                label="Overtime Requests"
                                isActive={!!formData.can_approve_overtime}
                                onToggle={() => handleToggle('can_approve_overtime')}
                            />
                            <ApprovalItem
                                label="Expense & Reimbursement"
                                isActive={!!formData.can_approve_expense}
                                onToggle={() => handleToggle('can_approve_expense')}
                            />
                        </div>
                    </section>
                </div>

                {/* Effective Access Preview Panel (MANDATORY) */}
                <div className="absolute bottom-24 left-6 right-6 z-20">
                    <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-xl shadow-blue-200 border border-blue-500 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center ring-1 ring-white/30 flex-shrink-0">
                                <Info className="w-4 h-4 text-white" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-[10px] uppercase font-black tracking-[0.1em] text-blue-100 opacity-80">Effective Access Preview</h4>
                                <p className="text-sm font-medium leading-normal text-white drop-shadow-sm">
                                    {effectivePreview}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-white border-t border-neutral-200 p-6 flex items-center justify-between sticky bottom-0 z-30">
                    <Button variant="secondary" onClick={onClose} className="h-11 px-8 rounded-xl font-bold">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-10 rounded-xl font-bold shadow-lg shadow-blue-100"
                        icon={<Save className="w-4 h-4" />}
                    >
                        {loading ? "Saving..." : `Save ${role.role_name} Rules`}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function CapabilityToggle({ label, description, isActive, onToggle }: { label: string, description: string, isActive: boolean, onToggle: () => void }) {
    return (
        <label className={clsx(
            "flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-all active:scale-[0.99]",
            isActive ? "bg-white border-blue-500 shadow-sm" : "bg-white border-neutral-200 hover:border-neutral-300"
        )}>
            <div className="pt-1">
                <input type="checkbox" checked={isActive} onChange={onToggle} className="hidden" />
                <div className={clsx(
                    "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                    isActive ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-neutral-300 text-transparent"
                )}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
            </div>
            <div className="flex-1">
                <div className="text-sm font-bold text-neutral-900 leading-none mb-1">{label}</div>
                <div className="text-[11px] text-neutral-500 font-medium leading-tight">{description}</div>
            </div>
        </label>
    );
}

function ApprovalItem({ label, isActive, onToggle }: { label: string, isActive: boolean, onToggle: () => void }) {
    return (
        <div className="flex items-center justify-between px-5 py-4">
            <div className="text-sm font-bold text-neutral-900">{label}</div>
            <button
                onClick={onToggle}
                className={clsx(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                    isActive ? "bg-orange-500" : "bg-neutral-200"
                )}
            >
                <span
                    className={clsx(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        isActive ? "translate-x-6" : "translate-x-1"
                    )}
                />
            </button>
        </div>
    );
}
