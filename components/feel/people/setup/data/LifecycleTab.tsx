"use client";

import { useEffect, useState } from "react";
import { History, RefreshCw, Trash2, Loader2, AlertCircle, Lock, Search, ChevronDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { clsx } from "clsx";

const DOMAINS = [
    { id: 'people_roles', table: 'organization_roles', domain: 'People', sub_domain: 'Roles', label: 'People Roles' },
    { id: 'people_depts', table: 'organization_departments', domain: 'People', sub_domain: 'Departments', label: 'Departments' },
    { id: 'people_levels', table: 'organization_levels', domain: 'People', sub_domain: 'Levels & Grades', label: 'Levels & Grades' },
    { id: 'people_skills', table: 'organization_skills', domain: 'People', sub_domain: 'Skills', label: 'Skills' },
];

export default function LifecycleTab() {
    const [archivedItems, setArchivedItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState<string | null>(null);
    const [locks, setLocks] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState("");

    const loadData = async () => {
        setLoading(true);
        const supabase = createClient();

        // 1. Load Locks
        const { data: lockData } = await supabase.from('data_control_settings').select('sub_domain, is_locked');
        const lockMap = (lockData || []).reduce((acc: Record<string, boolean>, l: any) => ({ ...acc, [l.sub_domain]: l.is_locked }), {});
        setLocks(lockMap);

        // 2. Load Archived Items from all domains
        let allArchived: any[] = [];

        for (const domain of DOMAINS) {
            const { data } = await supabase
                .from(domain.table)
                .select('*')
                .eq('status', 'Archived');

            if (data) {
                allArchived = [...allArchived, ...data.map((item: any) => ({
                    ...item,
                    _domain: domain.domain,
                    _subDomain: domain.sub_domain,
                    _table: domain.table
                }))];
            }
        }

        setArchivedItems(allArchived.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()));
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredItems = archivedItems.filter(item =>
        (item.name || item.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        item._domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item._subDomain.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleRestore = async (item: any) => {
        if (locks[item._subDomain]) return;

        setActioning(item.id);
        const supabase = createClient();
        const { error } = await supabase
            .from(item._table)
            .update({ status: 'Active' })
            .eq('id', item.id);

        if (!error) {
            await supabase.rpc('record_governance_event', {
                p_action: 'Restore',
                p_domain: item._domain,
                p_sub_domain: item._subDomain,
                p_entity_id: item.id,
                p_entity_name: item.name || item.code
            });
            await loadData();
        }
        setActioning(null);
    };

    const handleDelete = async (item: any) => {
        if (locks[item._subDomain]) return;
        if (!confirm(`Are you sure you want to PERMANENTLY delete "${item.name || item.code}"? This cannot be undone.`)) return;

        setActioning(item.id);
        const supabase = createClient();
        const { error } = await supabase
            .from(item._table)
            .delete()
            .eq('id', item.id);

        if (!error) {
            await supabase.rpc('record_governance_event', {
                p_action: 'Permanent Delete',
                p_domain: item._domain,
                p_sub_domain: item._subDomain,
                p_entity_id: item.id,
                p_entity_name: item.name || item.code
            });
            await loadData();
        }
        setActioning(null);
    };

    if (loading && archivedItems.length === 0) return <div className="p-12 text-center text-neutral-400 flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span>Scanning domains for archived items...</span>
    </div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex flex-1 w-full md:max-w-md items-center gap-2 bg-white border border-neutral-200 px-3 py-2 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <Search className="w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search archived by name, domain, or sub-domain..."
                        className="bg-transparent border-none outline-none text-sm w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-sm max-w-xl">
                    <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <p className="text-[10px] md:text-xs text-blue-800 leading-tight">
                        Restore or permanently delete archived data. Action disabled if domain is <strong>LOCKED</strong>.
                    </p>
                </div>
            </div>

            {/* Content: Mobile Cards / Desktop Table */}
            <div className="space-y-4 md:hidden">
                {filteredItems.map((item) => {
                    const isLocked = locks[item._subDomain];
                    return (
                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="font-bold text-neutral-900 text-lg leading-tight">{item.name || item.code}</div>
                                    <div className="text-[10px] text-neutral-400 font-mono">{item.id}</div>
                                </div>
                                <span className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[10px] font-bold uppercase tracking-tight text-neutral-600">
                                    {item._domain}
                                </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-neutral-500">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-300"></div>
                                    {item._subDomain}
                                </div>
                                <div className="italic">
                                    Archived {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'Unknown'}
                                </div>
                            </div>

                            <div className="pt-3 border-t border-neutral-100">
                                {isLocked ? (
                                    <div className="flex items-center gap-1.5 text-red-500/50 justify-center py-2 bg-red-50/30 rounded-xl border border-red-100/30">
                                        <Lock className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Domain Locked</span>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRestore(item)}
                                            disabled={actioning === item.id}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {actioning === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                            Restore Item
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item)}
                                            disabled={actioning === item.id}
                                            className="w-12 flex items-center justify-center bg-neutral-50 text-neutral-400 border border-neutral-100 rounded-xl hover:text-red-500 hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="hidden md:block bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-neutral-50/80 border-b border-neutral-200">
                            <tr>
                                <th className="px-5 py-4 text-[10px] font-bold text-neutral-600 uppercase tracking-[0.15em]">Entity Name / Code</th>
                                <th className="px-5 py-4 text-[10px] font-bold text-neutral-600 uppercase tracking-[0.15em]">Domain</th>
                                <th className="px-5 py-4 text-[10px] font-bold text-neutral-600 uppercase tracking-[0.15em]">
                                    <div className="flex items-center gap-1">
                                        Archived Date
                                        <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                    </div>
                                </th>
                                <th className="px-5 py-4 text-[10px] font-bold text-neutral-600 uppercase tracking-[0.15em] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filteredItems.map((item) => {
                                const isLocked = locks[item._subDomain];
                                return (
                                    <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors group">
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-neutral-900">{item.name || item.code}</div>
                                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{item.id}</div>
                                        </td>
                                        <td className="px-5 py-4 text-neutral-600">
                                            <span className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[10px] font-bold uppercase tracking-tight">
                                                {item._domain} › {item._subDomain}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-neutral-500 italic">
                                            {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'Unknown'}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            {isLocked ? (
                                                <div className="flex justify-end items-center gap-1.5 text-red-500/50">
                                                    <Lock className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold uppercase tracking-tighter">Locked</span>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleRestore(item)}
                                                        disabled={actioning === item.id}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {actioning === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                        Restore
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        disabled={actioning === item.id}
                                                        className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                                                        title="Delete Permanently"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredItems.length === 0 && (
                <div className="p-20 bg-white rounded-2xl border border-neutral-200 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center">
                            <History className="w-6 h-6 text-neutral-300" />
                        </div>
                        <div>
                            <p className="font-bold text-neutral-900">No archived items</p>
                            <p className="text-xs text-neutral-400">Archived items from all domains will appear here.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
