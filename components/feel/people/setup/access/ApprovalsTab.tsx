import React, { useState, useEffect } from 'react';
import { FastForward, ShieldCheck, Loader2, CheckCircle2, Info, AlertTriangle, ChevronDown } from 'lucide-react';
import { fetchSystemRoles, fetchRolePermissions, upsertRolePermission } from '@/lib/api/organization';
import { OrganizationSystemRole, OrganizationRolePermission } from '@/lib/types/organization';

export default function ApprovalsTab({ isLocked }: { isLocked?: boolean }) {
    const [roles, setRoles] = useState<OrganizationSystemRole[]>([]);
    const [permissions, setPermissions] = useState<OrganizationRolePermission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);
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
        setIsLoading(false);
    };

    const handleToggle = async (roleId: string, field: keyof OrganizationRolePermission) => {
        const currentPerm = permissions.find(p => p.role_id === roleId) || {
            role_id: roleId,
            can_view_directory: true,
            can_manage_people: false,
            can_view_performance_summary: false,
            can_view_performance_detail: false,
            can_approve_leave: false,
            can_approve_overtime: false,
            can_approve_expense: false,
            visibility_level: 'Internal',
            visibility_scope: 'Team'
        };

        const updatedPerm = {
            ...currentPerm,
            [field]: !currentPerm[field as keyof typeof currentPerm]
        };

        // Optimistic update
        setPermissions(prev => {
            const exists = prev.find(p => p.role_id === roleId);
            if (exists) {
                return prev.map(p => p.role_id === roleId ? updatedPerm as OrganizationRolePermission : p);
            }
            return [...prev, updatedPerm as OrganizationRolePermission];
        });

        setIsSaving(roleId);
        const result = await upsertRolePermission(updatedPerm);
        if (!result) {
            await loadData();
        }
        setIsSaving(null);
    };

    const DOMAINS = [
        { key: 'can_approve_leave', label: 'Leave Requests', description: 'Annual, sick, and personal leave' },
        { key: 'can_approve_overtime', label: 'Overtime', description: 'Extra hours and weekend work' },
        { key: 'can_approve_expense', label: 'Expenses', description: 'Reimbursements and purchasing' }
    ];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm text-neutral-500 font-medium">Fetching approval authority...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-200">
                    <FastForward className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-blue-900 mb-1">Approval Authority</h3>
                    <p className="text-xs text-blue-700/80 leading-relaxed max-w-2xl">
                        Define which roles have the power to approve or reject requests. Approvals are trust-based; currently, no amount or quota limits are enforced at the system role level.
                    </p>
                </div>
            </div>

            <div className="hidden md:block bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-50/80 border-b border-neutral-200">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 min-w-[200px]">System Role</th>
                                {DOMAINS.map(domain => (
                                    <th key={domain.key} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-center min-w-[150px]">
                                        {domain.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map(role => {
                                const perm = permissions.find(p => p.role_id === role.id);
                                return (
                                    <tr key={role.id} className="border-b border-neutral-100 hover:bg-neutral-50/30 transition-colors group">
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                    <ShieldCheck className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-neutral-900 leading-none mb-1">{role.name}</span>
                                                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">{role.code}</span>
                                                </div>
                                                {isSaving === role.id && <Loader2 className="w-3 h-3 text-blue-600 animate-spin ml-2" />}
                                            </div>
                                        </td>
                                        {DOMAINS.map(domain => {
                                            const isActive = perm ? !!(perm as any)[domain.key] : false;
                                            return (
                                                <td key={domain.key} className="px-6 py-6">
                                                    <div className="flex justify-center">
                                                        <button
                                                            onClick={() => !isLocked && handleToggle(role.id, domain.key as any)}
                                                            className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${isActive
                                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                                : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
                                                                } ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                                            title={isActive ? `Can approve ${domain.label}` : `Cannot approve ${domain.label}`}
                                                            disabled={isLocked}
                                                        >
                                                            {isActive ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-neutral-300" />}
                                                        </button>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile View - Accordion */}
            <div className="md:hidden space-y-3">
                {roles.map(role => {
                    const perm = permissions.find(p => p.role_id === role.id);
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
                                    {isSaving === role.id && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
                                    <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-600' : ''}`} />
                                </div>
                            </button>

                            {/* Accordion Content */}
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] border-t border-neutral-100' : 'max-h-0'}`}>
                                <div className="p-4 bg-neutral-50/50 space-y-3">
                                    {DOMAINS.map(domain => {
                                        const isActive = perm ? !!(perm as any)[domain.key] : false;
                                        return (
                                            <div
                                                key={domain.key}
                                                className="flex items-center justify-between bg-white p-4 rounded-xl border border-neutral-100 shadow-sm"
                                            >
                                                <div className="flex flex-col pr-4">
                                                    <span className="text-xs font-bold text-neutral-800">{domain.label}</span>
                                                    <span className="text-[10px] text-neutral-500">{domain.description}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!isLocked) handleToggle(role.id, domain.key as any);
                                                    }}
                                                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-blue-600' : 'bg-neutral-200'} ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                                    disabled={isLocked}
                                                >
                                                    <span
                                                        aria-hidden="true"
                                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`}
                                                    />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4 items-start">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-xs text-amber-800 leading-relaxed">
                    <span className="font-bold block mb-1">Escalation Policy</span>
                    By default, if a Supervisor is unavailable or the request exceeds their purview, it can be approved by a Superadmin.
                </div>
            </div>
        </div>
    );
}
