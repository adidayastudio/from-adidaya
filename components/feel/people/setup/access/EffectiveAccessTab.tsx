import React, { useState, useEffect } from 'react';
import { Info, ShieldCheck, Eye, CheckCircle2, FastForward, AlertCircle, Loader2, Search, ChevronDown } from 'lucide-react';
import { fetchSystemRoles, fetchRolePermissions } from '@/lib/api/organization';
import { OrganizationSystemRole, OrganizationRolePermission } from '@/lib/types/organization';

export default function EffectiveAccessTab() {
    const [roles, setRoles] = useState<OrganizationSystemRole[]>([]);
    const [permissions, setPermissions] = useState<OrganizationRolePermission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState<OrganizationSystemRole | null>(null);
    const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [roleData, permData] = await Promise.all([
            fetchSystemRoles(),
            fetchRolePermissions()
        ]);
        setRoles(roleData);
        setPermissions(permData);
        if (roleData.length > 0) {
            setSelectedRole(roleData[0]);
        }
        setIsLoading(false);
    };

    const currentPerm = selectedRole ? permissions.find(p => p.role_id === selectedRole.id) : null;

    const renderSummary = (role: OrganizationSystemRole, perm: OrganizationRolePermission | null) => {
        if (!role || !perm) return <div className="p-4 text-xs text-neutral-400 italic">No configuration found for this role.</div>;

        const canPerform = [];
        if (perm.can_view_directory) canPerform.push("view the company directory");
        if (perm.can_manage_people) canPerform.push("manage employee profiles and employment data");
        if (perm.can_view_performance_summary) canPerform.push("see KPI summary scores");
        if (perm.can_view_performance_detail) canPerform.push("drill down into performance details and feedback");

        const canApprove = [];
        if (perm.can_approve_leave) canApprove.push("leave requests");
        if (perm.can_approve_overtime) canApprove.push("overtime hours");
        if (perm.can_approve_expense) canApprove.push("expense claims");

        const cannotAccess = [];
        if (!perm.can_manage_people) cannotAccess.push("modify employee records");
        if (!perm.can_view_performance_detail) cannotAccess.push("access sensitive performance detail");
        if (canApprove.length === 0) cannotAccess.push("approve any organizational requests");

        const scopeLabel = perm.visibility_scope === 'Global' ? 'across all teams' :
            perm.visibility_scope === 'Team' ? 'within their primary team' :
                'for themselves only';

        const levelLabel = perm.visibility_level === 'Sensitive' ? 'comprehensive sensitive data (legal, bank, contract)' :
            perm.visibility_level === 'Restricted' ? 'restricted operational data (KPI sums)' :
                perm.visibility_level === 'Internal' ? 'internal company information (skills, availability)' :
                    'basic public information';

        return (
            <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-neutral-200/60 p-6 shadow-sm">
                    <h4 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                        Executive Summary
                    </h4>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                        The <span className="font-bold text-neutral-900 italic">"{role.name}"</span> role can view <span className="font-bold text-blue-600">{levelLabel}</span> <span className="underline decoration-blue-200 decoration-2 underline-offset-4">{scopeLabel}</span>.
                        They are authorized to {canPerform.join(", ")}.
                        {canApprove.length > 0 ? (
                            <> They have authority to approve <span className="font-bold text-green-600">{canApprove.join(", ")}</span>.</>
                        ) : (
                            <> They do not have any approval authority.</>
                        )}
                        {cannotAccess.length > 0 && (
                            <span className="block mt-4 text-xs font-medium text-red-500/80 italic">
                                * Explicitly restricted from: {cannotAccess.join(", ")}.
                            </span>
                        )}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 bg-blue-50/30 border border-blue-100/50 rounded-2xl">
                        <div className="flex items-center gap-3 mb-3">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Permissions</span>
                        </div>
                        <ul className="space-y-2">
                            {canPerform.map((p, i) => (
                                <li key={i} className="text-xs text-neutral-600 flex items-start gap-2 capitalize">
                                    <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                    {p}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="p-5 bg-green-50/30 border border-green-100/50 rounded-2xl">
                        <div className="flex items-center gap-3 mb-3">
                            <FastForward className="w-4 h-4 text-green-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-green-600">Authority</span>
                        </div>
                        <ul className="space-y-2">
                            {canApprove.length > 0 ? canApprove.map((p, i) => (
                                <li key={i} className="text-xs text-neutral-600 flex items-start gap-2 capitalize">
                                    <div className="w-1 h-1 rounded-full bg-green-400 mt-1.5 shrink-0" />
                                    {p}
                                </li>
                            )) : <li className="text-xs text-neutral-400 italic">No approval authority</li>}
                        </ul>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm text-neutral-500 font-medium">Calculating effective access...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-200">
                    <Info className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-blue-900 mb-1">Effective Access Simulator</h3>
                    <p className="text-xs text-blue-700/80 leading-relaxed max-w-2xl">
                        A real-time, human-readable preview of what a role can see and do. Use this tab to audit policies and ensure they align with organizational trust requirements.
                    </p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Desktop View */}
                <div className="hidden lg:flex gap-8">
                    {/* Role List */}
                    <div className="w-full lg:w-72 shrink-0 space-y-3">
                        <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">Select Role to Audit</h4>
                        <div className="space-y-2">
                            {roles.map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => setSelectedRole(role)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedRole?.id === role.id
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
                                        : 'bg-white border-neutral-200 text-neutral-600 hover:border-blue-300'
                                        }`}
                                >
                                    <ShieldCheck className={`w-4 h-4 ${selectedRole?.id === role.id ? 'text-blue-100' : 'text-neutral-400'}`} />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-bold truncate leading-none mb-0.5">{role.name}</span>
                                        <span className={`text-[10px] font-mono uppercase tracking-wider ${selectedRole?.id === role.id ? 'text-blue-200' : 'text-neutral-400'}`}>
                                            {role.code}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Audit Result */}
                    <div className="flex-1 space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Effective Rights for {selectedRole?.name}</h4>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Live Preview
                            </div>
                        </div>

                        {renderSummary(selectedRole!, currentPerm || null)}

                        <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">
                                Note: This preview focuses on system-defined policies. Domain-specific overrides (like custom department rules) are not shown here. For a full audit, check the **Sensitive Data Rules** tab (coming soon).
                            </p>
                        </div>
                    </div>
                </div>

                {/* Mobile View - Accordion */}
                <div className="lg:hidden space-y-3">
                    {roles.map(role => {
                        const perm = permissions.find(p => p.role_id === role.id) || null;
                        const isExpanded = expandedRoleId === role.id;

                        return (
                            <div key={role.id} className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${isExpanded ? 'border-blue-200 ring-1 ring-blue-50' : 'border-neutral-200'}`}>
                                {/* Accordion Header */}
                                <button
                                    onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}
                                    className="w-full flex items-center justify-between p-5 bg-white active:bg-neutral-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isExpanded ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className="font-bold text-neutral-900 leading-tight">{role.name}</span>
                                            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">{role.code}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-600' : ''}`} />
                                    </div>
                                </button>

                                {/* Accordion Content */}
                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1200px] border-t border-neutral-100' : 'max-h-0'}`}>
                                    <div className="p-4 bg-neutral-50/50">
                                        <div className="mb-4 flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 w-fit">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                Live Audit Result
                                            </div>
                                        </div>
                                        {renderSummary(role, perm)}

                                        <div className="mt-6 p-4 bg-white rounded-2xl border border-neutral-200 flex items-start gap-3">
                                            <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">
                                                Note: This preview focuses on system-defined policies. Domain-specific overrides (like custom department rules) are not shown here.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
