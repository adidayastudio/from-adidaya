"use client";

import { useEffect, useState } from "react";
import { FileText, Search, Filter, Loader2, Download, AlertCircle, ShieldAlert, Banknote, ChevronDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { clsx } from "clsx";

export default function AuditLogTab() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDomain, setFilterDomain] = useState("All");

    const loadLogs = async () => {
        setLoading(true);
        const supabase = createClient();

        let query = supabase
            .from('governance_audit_log')
            .select('*')
            .order('timestamp', { ascending: false });

        if (filterDomain !== "All") {
            query = query.eq('domain', filterDomain);
        }

        const { data } = await query;
        setLogs(data || []);
        setLoading(false);
    };

    useEffect(() => {
        loadLogs();
    }, [filterDomain]);

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.sub_domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && logs.length === 0) return <div className="p-12 text-center text-neutral-400 flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span>Loading governance event history...</span>
    </div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Toolbar */}
            <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                <div className="flex flex-1 min-w-[140px] md:max-w-md items-center gap-2 bg-white border border-neutral-200 px-3 py-2 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <Search className="w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="bg-transparent border-none outline-none text-sm w-full placeholder:text-neutral-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2 bg-white border border-neutral-200 px-3 md:px-4 py-2 md:py-2.5 rounded-full text-sm font-bold shadow-sm hover:border-neutral-300 transition-colors group relative">
                        <Filter className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
                        <select
                            className="bg-transparent border-none outline-none cursor-pointer appearance-none pr-4 md:pr-6 text-neutral-600 font-bold text-xs md:text-sm"
                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23a3a3a3\' stroke-width=\'2\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '10px' }}
                            value={filterDomain}
                            onChange={(e) => setFilterDomain(e.target.value)}
                        >
                            <option value="All">All</option>
                            <option value="STRUCTURE">Structure</option>
                            <option value="EMPLOYMENT">Employment</option>
                            <option value="SKILLS">Skills</option>
                            <option value="PERFORMANCE">Performance</option>
                            <option value="ACCESS">Access</option>
                        </select>
                    </div>

                    <button className="flex items-center justify-center p-2.5 md:px-6 md:py-2.5 bg-white text-neutral-600 border border-neutral-200 rounded-full text-sm font-bold shadow-sm hover:bg-neutral-50 hover:border-neutral-300 transition-all active:scale-95">
                        <Download className="w-4 h-4" />
                        <span className="hidden md:inline ml-2">Export</span>
                    </button>
                </div>
            </div>

            {/* Content: Mobile Cards / Desktop Table */}
            <div className="space-y-4 md:hidden">
                {filteredLogs.map((log) => (
                    <div key={log.id} className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm space-y-3">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className={clsx(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                    log.action === 'Lock' ? 'bg-red-50 text-red-600' :
                                        log.action === 'Unlock' ? 'bg-green-50 text-green-600' :
                                            log.action === 'Restore' ? 'bg-blue-50 text-blue-600' :
                                                'bg-neutral-100 text-neutral-500'
                                )}>
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-neutral-900 text-base">{log.action}</div>
                                    <div className="text-xs text-neutral-500">{log.actor_name || 'System Auto'}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{log.domain}</div>
                                <div className="text-xs font-bold text-neutral-700">{log.sub_domain}</div>
                            </div>
                        </div>

                        {log.entity_name && (
                            <div className="px-3 py-2 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                <div className="text-[10px] uppercase font-black text-blue-500 tracking-widest opacity-60">Impacted Entity</div>
                                <div className="text-sm font-bold text-blue-900">{log.entity_name}</div>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                            <div className="flex gap-2">
                                {log.is_payroll_impact && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-100 rounded-full text-[10px] font-bold text-amber-600 uppercase tracking-tight">
                                        <Banknote className="w-3 h-3" />
                                        Payroll
                                    </div>
                                )}
                                {log.is_security_impact && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-100 rounded-full text-[10px] font-bold text-red-600 uppercase tracking-tight">
                                        <ShieldAlert className="w-3 h-3" />
                                        Security
                                    </div>
                                )}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-medium">
                                {new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="hidden md:block bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-neutral-50/80 border-b border-neutral-200">
                            <tr>
                                <th className="px-5 py-4 text-[10px] font-bold text-neutral-600 uppercase tracking-[0.15em]">Event & Actor</th>
                                <th className="px-5 py-4 text-[10px] font-bold text-neutral-600 uppercase tracking-[0.15em]">Context</th>
                                <th className="px-5 py-4 text-[10px] font-bold text-neutral-600 uppercase tracking-[0.15em]">Impact</th>
                                <th className="px-5 py-4 text-[10px] font-bold text-neutral-600 uppercase tracking-[0.15em]">
                                    <div className="flex items-center justify-end gap-1">
                                        Timestamp
                                        <ChevronDown className="w-3 h-3 text-blue-600" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                log.action === 'Lock' ? 'bg-red-50 text-red-600' :
                                                    log.action === 'Unlock' ? 'bg-green-50 text-green-600' :
                                                        log.action === 'Restore' ? 'bg-blue-50 text-blue-600' :
                                                            'bg-neutral-100 text-neutral-500'
                                            )}>
                                                <AlertCircle className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-neutral-900">{log.action}</div>
                                                <div className="text-xs text-neutral-500">{log.actor_name || 'System Auto'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{log.domain}</span>
                                            <span className="text-neutral-300">/</span>
                                            <span className="text-sm font-medium text-neutral-700">{log.sub_domain}</span>
                                        </div>
                                        {log.entity_name && (
                                            <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                                                Entity: {log.entity_name}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex gap-2">
                                            {log.is_payroll_impact && (
                                                <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-100 rounded-full text-[10px] font-bold text-amber-600 uppercase tracking-tighter shadow-sm">
                                                    <Banknote className="w-3 h-3" />
                                                    Payroll
                                                </div>
                                            )}
                                            {log.is_security_impact && (
                                                <div className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-100 rounded-full text-[10px] font-bold text-red-600 uppercase tracking-tighter shadow-sm">
                                                    <ShieldAlert className="w-3 h-3" />
                                                    Security
                                                </div>
                                            )}
                                            {!log.is_payroll_impact && !log.is_security_impact && (
                                                <span className="text-neutral-400 text-xs">—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="text-xs font-medium text-neutral-900">
                                            {new Date(log.timestamp).toLocaleDateString()}
                                        </div>
                                        <div className="text-[10px] text-neutral-400 italic mt-0.5">
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredLogs.length === 0 && (
                <div className="p-20 bg-white rounded-2xl border border-neutral-200 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center">
                            <FileText className="w-6 h-6 text-neutral-300" />
                        </div>
                        <div>
                            <p className="font-bold text-neutral-900">No governance events</p>
                            <p className="text-xs text-neutral-400">All lock, unlock, and lifecycle actions are recorded here.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
