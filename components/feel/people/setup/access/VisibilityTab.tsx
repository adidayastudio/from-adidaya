import React, { useState, useEffect } from 'react';
import { Eye, ShieldCheck, Loader2, ArrowRight, Info, Globe, Users, User, ChevronDown } from 'lucide-react';
import { fetchSystemRoles, fetchRolePermissions, upsertRolePermission } from '@/lib/api/organization';
import { OrganizationSystemRole, OrganizationRolePermission, VisibilityLevel, VisibilityScope } from '@/lib/types/organization';

export default function VisibilityTab({ isLocked }: { isLocked?: boolean }) {
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

    const handleUpdate = async (roleId: string, field: 'visibility_level' | 'visibility_scope', value: string) => {
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
            [field]: value
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

    const SCOPES: { value: VisibilityScope; icon: any; label: string; desc: string }[] = [
        { value: 'Self', icon: User, label: 'Self Only', desc: 'Can only see their own data' },
        { value: 'Team', icon: Users, label: 'Team', desc: 'Can see data for their direct team/department' },
        { value: 'Global', icon: Globe, label: 'Global', desc: 'Can see data across all organizational units' }
    ];

    const LEVELS: { value: VisibilityLevel; color: string; desc: string }[] = [
        { value: 'Public', color: 'bg-green-100 text-green-700', desc: 'Basic info (Name, Role, Dept)' },
        { value: 'Internal', color: 'bg-blue-100 text-blue-700', desc: 'Working info (Skills, Availability)' },
        { value: 'Restricted', color: 'bg-amber-100 text-amber-700', desc: 'High-level performance (KPI Summary)' },
        { value: 'Sensitive', color: 'bg-red-100 text-red-700', desc: 'Personal data (Bank, Salary, Legal)' }
    ];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm text-neutral-500 font-medium">Fetching visibility rules...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-200">
                    <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-blue-900 mb-1">Data Visibility Rules</h3>
                    <p className="text-xs text-blue-700/80 leading-relaxed max-w-2xl">
                        Control WHAT specific data subsets and SCOPE each role can access. Visibility Level determines the sensitivity of data, while Visibility Scope determines the organizational reach.
                    </p>
                </div>
            </div>

            <div className="hidden md:block bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-50/80 border-b border-neutral-200">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">System Role</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Visibility Scope</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Visibility Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map(role => {
                                const perm = permissions.find(p => p.role_id === role.id);
                                const currentScope = perm?.visibility_scope || 'Self';
                                const currentLevel = perm?.visibility_level || 'Public';

                                return (
                                    <tr key={role.id} className="border-b border-neutral-100 hover:bg-neutral-50/30 transition-colors">
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
                                        <td className="px-6 py-6">
                                            <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit">
                                                {SCOPES.map(scope => {
                                                    const Icon = scope.icon;
                                                    const isActive = currentScope === scope.value;
                                                    return (
                                                        <button
                                                            key={scope.value}
                                                            onClick={() => !isLocked && handleUpdate(role.id, 'visibility_scope', scope.value)}
                                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isActive
                                                                ? 'bg-white text-blue-600 shadow-sm'
                                                                : 'text-neutral-500 hover:bg-white/50'
                                                                } ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                                            title={scope.desc}
                                                            disabled={isLocked}
                                                        >
                                                            <Icon className={`w-3 h-3 ${isActive ? 'text-blue-600' : 'text-neutral-400'}`} />
                                                            {scope.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit">
                                                {LEVELS.map(level => {
                                                    const isActive = currentLevel === level.value;
                                                    const colorParts = level.color.split(' ');
                                                    const bgColor = colorParts[0];
                                                    const textColor = colorParts[1];

                                                    return (
                                                        <button
                                                            key={level.value}
                                                            onClick={() => !isLocked && handleUpdate(role.id, 'visibility_level', level.value)}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${isActive
                                                                ? `${bgColor} ${textColor} shadow-sm ring-1 ring-black/5`
                                                                : 'text-neutral-400 hover:bg-white/50'
                                                                } ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                                            title={level.desc}
                                                            disabled={isLocked}
                                                        >
                                                            {level.value}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
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
                    const currentScope = perm?.visibility_scope || 'Self';
                    const currentLevel = perm?.visibility_level || 'Public';
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
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[600px] border-t border-neutral-100' : 'max-h-0'}`}>
                                <div className="p-4 bg-neutral-50/50 space-y-6">
                                    {/* Scope Section */}
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">Visibility Scope</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {SCOPES.map(scope => {
                                                const Icon = scope.icon;
                                                const isActive = currentScope === scope.value;
                                                return (
                                                    <button
                                                        key={scope.value}
                                                        onClick={() => !isLocked && handleUpdate(role.id, 'visibility_scope', scope.value)}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${isActive
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
                                                            : 'bg-white border-neutral-200 text-neutral-600 hover:border-blue-300'
                                                            } ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                                        disabled={isLocked}
                                                    >
                                                        <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-500/50' : 'bg-neutral-100'}`}>
                                                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold leading-none mb-1">{scope.label}</span>
                                                            <span className={`text-[10px] ${isActive ? 'text-blue-100' : 'text-neutral-400'}`}>{scope.desc}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Level Section */}
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">Visibility Level</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {LEVELS.map(level => {
                                                const isActive = currentLevel === level.value;
                                                const colorParts = level.color.split(' ');
                                                const bgColor = colorParts[0];
                                                const textColor = colorParts[1];

                                                return (
                                                    <button
                                                        key={level.value}
                                                        onClick={() => !isLocked && handleUpdate(role.id, 'visibility_level', level.value)}
                                                        className={`p-3 rounded-xl border transition-all text-center flex flex-col items-center gap-1 ${isActive
                                                            ? `${bgColor} ${textColor} border-current shadow-sm`
                                                            : 'bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300'
                                                            } ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                                        disabled={isLocked}
                                                    >
                                                        <span className="text-[10px] font-black uppercase tracking-widest">{level.value}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[10px] text-neutral-400 text-center italic mt-2">
                                            * {LEVELS.find(l => l.value === currentLevel)?.desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="hidden md:grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest px-1">Scope Explanation</h4>
                    <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 grid gap-4">
                        {SCOPES.map(scope => (
                            <div key={scope.value} className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-white border border-neutral-200">
                                    <scope.icon className="w-3.5 h-3.5 text-neutral-600" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-neutral-900">{scope.label}</div>
                                    <div className="text-[10px] text-neutral-500 font-medium">{scope.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-3">
                    <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest px-1">Level Explanation</h4>
                    <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 grid gap-4">
                        {LEVELS.map(level => (
                            <div key={level.value} className="flex items-start gap-3">
                                <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${level.color}`}>
                                    {level.value}
                                </div>
                                <div className="text-[10px] text-neutral-500 font-medium pt-1">
                                    {level.desc}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
