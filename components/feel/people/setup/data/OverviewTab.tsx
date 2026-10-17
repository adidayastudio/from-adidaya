"use client";

import { useEffect, useState } from "react";
import { Lock, History, AlertCircle, Clock, ShieldAlert } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function OverviewTab() {
    const [stats, setStats] = useState({
        lockedCount: 0,
        archivedCount: 0,
        recentChanges: [] as any[],
        lastChange: null as any
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            const supabase = createClient();

            // 1. Get Locked Configurations Count
            const { data: locks } = await supabase
                .from('data_control_settings')
                .select('*')
                .eq('is_locked', true);

            const GOVERNED_KEYS = [
                'People:Departments', 'People:Positions', 'People:Levels',
                'People:Employment Types', 'People:Work Status', 'People:Employment Policy',
                'People:Work Schedule', 'People:Leave',
                'People:Skill Categories', 'People:Skill Library',
                'People:Weighting', 'People:Evaluation Period', 'People:Scoring Logic', 'People:Incentive Rules',
                'Access:System Roles', 'Access:Capabilities', 'Access:Data Visibility', 'Access:Approval Authority'
            ];

            const filteredLocks = (locks || []).filter(l =>
                GOVERNED_KEYS.includes(`${l.domain}:${l.sub_domain}`)
            );

            // 2. Get Last Changes
            const { data: logs } = await supabase
                .from('governance_audit_log')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(5);

            setStats({
                lockedCount: filteredLocks.length,
                archivedCount: 0,
                recentChanges: logs || [],
                lastChange: logs?.[0] || null
            });
            setLoading(false);
        };
        loadStats();
    }, []);

    if (loading) return <div className="p-8 text-center text-neutral-400">Loading overview...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-red-600" />
                        </div>
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Locked Domains</span>
                    </div>
                    <div className="text-3xl font-bold text-neutral-900">{stats.lockedCount}</div>
                    <p className="text-[10px] text-neutral-400 mt-1 italic">Active governance locks</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <History className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Archived Items</span>
                    </div>
                    <div className="text-3xl font-bold text-neutral-900">{stats.archivedCount}</div>
                    <p className="text-[10px] text-neutral-400 mt-1 italic">Across all domains</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                            <ShieldAlert className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">High Impact</span>
                    </div>
                    <div className="text-3xl font-bold text-neutral-900">
                        {stats.recentChanges.filter(c => c.is_payroll_impact || c.is_security_impact).length}
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1 italic">Recent sensitive changes</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-neutral-600" />
                        </div>
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Last Activity</span>
                    </div>
                    <div className="text-sm font-bold text-neutral-900 truncate">
                        {stats.lastChange?.actor_name || 'No activity'}
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1 italic">
                        {stats.lastChange ? new Date(stats.lastChange.timestamp).toLocaleString() : '---'}
                    </p>
                </div>
            </div>

            {/* Recent High-Impact Changes */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-neutral-500" />
                        <h3 className="font-semibold text-neutral-900 text-sm">Recent Governance Activity</h3>
                    </div>
                </div>
                <div className="divide-y divide-neutral-100">
                    {stats.recentChanges.length > 0 ? (
                        stats.recentChanges.map((log) => (
                            <div key={log.id} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-neutral-900">{log.action}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-neutral-500 font-medium">
                                            {log.domain} › {log.sub_domain}
                                        </span>
                                    </div>
                                    <div className="text-xs text-neutral-500 flex items-center gap-2">
                                        <span>{log.actor_name}</span>
                                        <span className="w-1 h-1 rounded-full bg-neutral-300"></span>
                                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 text-[10px] font-bold uppercase tracking-tight">
                                    {log.is_payroll_impact && <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">Payroll</span>}
                                    {log.is_security_impact && <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100">Security</span>}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-neutral-400 italic text-sm">No recent activity recorded.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
