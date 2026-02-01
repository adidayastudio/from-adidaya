import React from 'react';
import { ShieldCheck, CheckCircle2, FastForward, AlertCircle } from 'lucide-react';
import { OrganizationSystemRole, OrganizationRolePermission } from '@/lib/types/organization';

interface RoleAccessPreviewProps {
    role: OrganizationSystemRole;
    permission: OrganizationRolePermission | null;
    isLoading?: boolean;
}

export default function RoleAccessPreview({ role, permission, isLoading }: RoleAccessPreviewProps) {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-10 gap-3 border border-neutral-100 rounded-2xl bg-white/50">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-neutral-500 font-medium">Loading permissions...</p>
            </div>
        );
    }

    if (!role || !permission) {
        return (
            <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                <ShieldCheck className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
                <p className="text-xs text-neutral-400 italic font-medium">No configuration found for this role.</p>
            </div>
        );
    }

    const canPerform = [];
    if (permission.can_view_directory) canPerform.push("view the company directory");
    if (permission.can_manage_people) canPerform.push("manage employee profiles and employment data");
    if (permission.can_view_performance_summary) canPerform.push("see KPI summary scores");
    if (permission.can_view_performance_detail) canPerform.push("drill down into performance details and feedback");

    const canApprove = [];
    if (permission.can_approve_leave) canApprove.push("leave requests");
    if (permission.can_approve_overtime) canApprove.push("overtime hours");
    if (permission.can_approve_expense) canApprove.push("expense claims");

    const cannotAccess = [];
    if (!permission.can_manage_people) cannotAccess.push("modify employee records");
    if (!permission.can_view_performance_detail) cannotAccess.push("access sensitive performance detail");
    if (canApprove.length === 0) cannotAccess.push("approve any organizational requests");

    const scopeLabel = permission.visibility_scope === 'Global' ? 'across all teams' :
        permission.visibility_scope === 'Team' ? 'within their primary team' :
            'for themselves only';

    const levelLabel = permission.visibility_level === 'Sensitive' ? 'comprehensive sensitive data (legal, bank, contract)' :
        permission.visibility_level === 'Restricted' ? 'restricted operational data (KPI sums)' :
            permission.visibility_level === 'Internal' ? 'internal company information (skills, availability)' :
                'basic public information';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Executive Summary */}
            <div className="bg-white rounded-2xl border border-neutral-200/60 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                        Executive Summary
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Live Preview
                    </div>
                </div>
                <p className="text-sm text-neutral-600 leading-relaxed">
                    The <span className="font-bold text-neutral-900 italic">"{role.name}"</span> role can view <span className="font-bold text-blue-600">{levelLabel}</span> <span className="underline decoration-blue-200 decoration-2 underline-offset-4">{scopeLabel}</span>.
                    They are authorized to {canPerform.join(", ")}.
                    {canApprove.length > 0 ? (
                        <> They have authority to approve <span className="font-bold text-green-600">{canApprove.join(", ")}</span>.</>
                    ) : (
                        <> They do not have any approval authority.</>
                    )}
                </p>
                {cannotAccess.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50/50 rounded-xl border border-red-100">
                        <span className="text-[10px] font-medium text-red-500/80 italic flex items-start gap-2">
                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                            Explicitly restricted from: {cannotAccess.join(", ")}.
                        </span>
                    </div>
                )}
            </div>

            {/* Grid Detail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 bg-blue-50/30 border border-blue-100/50 rounded-2xl group transition-all hover:bg-blue-50/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Permissions</span>
                    </div>
                    <ul className="space-y-2.5">
                        {canPerform.map((p, i) => (
                            <li key={i} className="text-xs text-neutral-600 flex items-start gap-2 capitalize">
                                <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                {p}
                            </li>
                        ))}
                        {canPerform.length === 0 && <li className="text-xs text-neutral-400 italic">No special permissions</li>}
                    </ul>
                </div>

                <div className="p-5 bg-green-50/30 border border-green-100/50 rounded-2xl group transition-all hover:bg-green-50/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white shadow-md shadow-green-200">
                            <FastForward className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-600">Authority</span>
                    </div>
                    <ul className="space-y-2.5">
                        {canApprove.length > 0 ? canApprove.map((p, i) => (
                            <li key={i} className="text-xs text-neutral-600 flex items-start gap-2 capitalize">
                                <div className="w-1 h-1 rounded-full bg-green-400 mt-1.5 shrink-0" />
                                {p}
                            </li>
                        )) : <li className="text-xs text-neutral-400 italic">No approval authority assigned</li>}
                    </ul>
                </div>
            </div>

            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">
                    Note: This preview focuses on system-defined policies. Domain-specific overrides (like custom department rules) are not shown here.
                </p>
            </div>
        </div>
    );
}
