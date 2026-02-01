"use client";

import { useEffect, useState } from "react";
import { Lock, Unlock, ShieldCheck, AlertTriangle, Loader2, Save, RefreshCw, Database, Copy, Check } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { clsx } from "clsx";
import { Button } from "@/shared/ui/primitives/button/button";
import { toast } from "react-hot-toast";

const GOVERNED_DOMAINS = [
    // STRUCTURE
    { id: 'p-depts', domain: 'People', sub_domain: 'Departments', category: 'STRUCTURE', label: 'Departments', desc: 'Lock organizational hierarchy and department metadata.' },
    { id: 'p-pos', domain: 'People', sub_domain: 'Positions', category: 'STRUCTURE', label: 'Positions', desc: 'Lock job titles, role codes, and position definitions.' },
    { id: 'p-levels', domain: 'People', sub_domain: 'Levels', category: 'STRUCTURE', label: 'Levels', desc: 'Lock organization grade levels and rank structures.' },

    // EMPLOYMENT
    { id: 'p-etype', domain: 'People', sub_domain: 'Employment Types', category: 'EMPLOYMENT', label: 'Types', desc: 'Lock employment contract types (Full-time, Contract, etc).' },
    { id: 'p-wstatus', domain: 'People', sub_domain: 'Work Status', category: 'EMPLOYMENT', label: 'Work Status', desc: 'Lock status definitions (Probation, Active, Overtime Eligible).' },
    { id: 'p-epolicy', domain: 'People', sub_domain: 'Employment Policy', category: 'EMPLOYMENT', label: 'Employment Policy', desc: 'Lock global employment policy documents and rules.' },
    { id: 'p-wsched', domain: 'People', sub_domain: 'Work Schedule', category: 'EMPLOYMENT', label: 'Work Schedule', desc: 'Lock shift patterns and working hour configurations.' },
    { id: 'p-leave', domain: 'People', sub_domain: 'Leave', category: 'EMPLOYMENT', label: 'Leave', desc: 'Lock leave types and balance calculation rules.' },

    // SKILLS
    { id: 'p-scat', domain: 'People', sub_domain: 'Skill Categories', category: 'SKILLS', label: 'Skill Category', desc: 'Lock the taxonomy of skill groups and families.' },
    { id: 'p-slib', domain: 'People', sub_domain: 'Skill Library', category: 'SKILLS', label: 'Skill Library', desc: 'Lock the global dictionary of technical and soft skills.' },

    // PERFORMANCE
    { id: 'p-weight', domain: 'People', sub_domain: 'Weighting', category: 'PERFORMANCE', label: 'Weighting', desc: 'Lock performance KPI weighting and distribution rules.' },
    { id: 'p-period', domain: 'People', sub_domain: 'Evaluation Period', category: 'PERFORMANCE', label: 'Evaluation Period', desc: 'Lock appraisal cycles and timeline settings.' },
    { id: 'p-slogic', domain: 'People', sub_domain: 'Scoring Logic', category: 'PERFORMANCE', label: 'Scoring Logic', desc: 'Lock mathematical formulas for performance calculation.' },
    { id: 'p-irules', domain: 'People', sub_domain: 'Incentive Rules', category: 'PERFORMANCE', label: 'Incentive Rules', desc: 'Lock payout caps and redistribution policies.' },

    // ACCESS (Same as before but aligned)
    { id: 'a-roles', domain: 'Access', sub_domain: 'System Roles', category: 'ACCESS', label: 'System Roles', desc: 'Lock platform-wide roles and basic permissions.' },
    { id: 'a-caps', domain: 'Access', sub_domain: 'Capabilities', category: 'ACCESS', label: 'Capabilities', desc: 'Lock feature-level access for specific roles.' },
    { id: 'a-vis', domain: 'Access', sub_domain: 'Data Visibility', category: 'ACCESS', label: 'Data Visibility', desc: 'Lock cross-department data visibility rules.' },
    { id: 'a-appr', domain: 'Access', sub_domain: 'Approval Authority', category: 'ACCESS', label: 'Approval Authority', desc: 'Lock workflow limits and approval hierarchies.' }
];

export default function ProtectionTab() {
    const [locks, setLocks] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const [currentFetchedLocks, setCurrentFetchedLocks] = useState<Record<string, boolean>>({});

    const loadSettings = async () => {
        setLoading(true);
        setError(null);
        const supabase = createClient();

        try {
            const { data, error: fetchError } = await supabase
                .from('data_control_settings')
                .select('domain, sub_domain, is_locked');

            if (fetchError) throw fetchError;

            const lockMap: Record<string, boolean> = {};
            (data || []).forEach((item: { domain: string; sub_domain: string; is_locked: boolean }) => {
                lockMap[`${item.domain}:${item.sub_domain}`] = item.is_locked;
            });
            setLocks(lockMap);
            setCurrentFetchedLocks(lockMap);
        } catch (err: any) {
            console.error("Load failed:", err);
            setError({
                code: err.code || 'UNKNOWN',
                message: err.message || 'Database connection error'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const toggleLocal = (domain: string, subDomain: string) => {
        const key = `${domain}:${subDomain}`;
        setLocks(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const saveSettings = async () => {
        const loadingToast = toast.loading("Updating governance configuration...");
        setSaving(true);
        const supabase = createClient();

        try {
            const upsertData = GOVERNED_DOMAINS.map(d => ({
                domain: d.domain,
                sub_domain: d.sub_domain,
                is_locked: !!locks[`${d.domain}:${d.sub_domain}`],
                updated_at: new Date().toISOString()
            }));

            const { error: upsertError } = await supabase
                .from('data_control_settings')
                .upsert(upsertData, { onConflict: 'domain,sub_domain' });

            if (upsertError) throw upsertError;

            // Audit specific changes
            const changedDomains = GOVERNED_DOMAINS.filter(d => {
                const key = `${d.domain}:${d.sub_domain}`;
                const prev = !!currentFetchedLocks?.[key];
                const next = !!locks[key];
                return prev !== next;
            });

            for (const d of changedDomains) {
                const isLocking = !!locks[`${d.domain}:${d.sub_domain}`];
                await supabase.rpc('record_governance_event', {
                    p_action: isLocking ? 'Lock' : 'Unlock',
                    p_domain: d.category,
                    p_sub_domain: d.sub_domain,
                    p_is_security_impact: true
                });
            }

            // Always record the bulk config update as a general event if many items changed or just as a summary
            if (changedDomains.length === 0) {
                await supabase.rpc('record_governance_event', {
                    p_action: 'Policy Refresh',
                    p_domain: 'Governance',
                    p_sub_domain: 'Controls',
                    p_is_security_impact: false
                });
            }

            await loadSettings();

            toast.success("Governance policy updated", {
                id: loadingToast,
                style: {
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    color: '#065f46',
                    fontWeight: 500,
                }
            });
        } catch (err: any) {
            console.error("Save failed:", err);
            const errCode = err.code || (err.error && err.error.code) || 'UNKNOWN';
            const errMsg = err.message || (err.error && err.error.message) || 'Save failed';

            setError({
                code: errCode,
                message: errMsg
            });

            toast.error(`Failed to save: ${errMsg}`, {
                id: loadingToast,
                style: {
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#991b1b',
                }
            });
        } finally {
            setSaving(false);
        }
    };

    const repairSQL = `-- 1. Basic Tables
CREATE TABLE IF NOT EXISTS data_control_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL,
    sub_domain TEXT NOT NULL,
    is_locked BOOLEAN DEFAULT false,
    locked_by UUID,
    locked_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(domain, sub_domain)
);

CREATE TABLE IF NOT EXISTS governance_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    domain TEXT NOT NULL,
    sub_domain TEXT NOT NULL,
    entity_id UUID,
    entity_name TEXT,
    actor_id UUID,
    actor_name TEXT,
    previous_value JSONB,
    new_value JSONB,
    is_payroll_impact BOOLEAN DEFAULT false,
    is_security_impact BOOLEAN DEFAULT false,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 2. Audit Helper
CREATE OR REPLACE FUNCTION record_governance_event(
    p_action TEXT, p_domain TEXT, p_sub_domain TEXT,
    p_entity_id UUID DEFAULT NULL, p_entity_name TEXT DEFAULT NULL,
    p_previous_value JSONB DEFAULT NULL, p_new_value JSONB DEFAULT NULL,
    p_is_payroll_impact BOOLEAN DEFAULT false, p_is_security_impact BOOLEAN DEFAULT false
) RETURNS VOID AS $$
DECLARE v_actor_name TEXT;
BEGIN
    SELECT name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
    INSERT INTO governance_audit_log (action, domain, sub_domain, entity_id, entity_name, actor_id, actor_name, is_payroll_impact, is_security_impact)
    VALUES (p_action, p_domain, p_sub_domain, p_entity_id, p_entity_name, auth.uid(), v_actor_name, p_is_payroll_impact, p_is_security_impact);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`;

    const copySQL = () => {
        navigator.clipboard.writeText(repairSQL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (error && (error.code === '42P01' || error.message?.includes("table"))) {
        return (
            <div className="max-w-xl mx-auto p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-50/50">
                    <Database className="w-10 h-10 text-red-500" />
                </div>
                <div>
                    <h3 className="text-xl font-extrabold text-neutral-900 tracking-tight">System Tables Missing</h3>
                    <p className="text-sm text-neutral-500 mt-2 max-w-sm mx-auto">
                        Governance tables haven't been created yet. Run the SQL repair script in your Supabase SQL Editor to activate this module.
                    </p>
                </div>

                <div className="bg-neutral-900 rounded-2xl p-6 text-left relative overflow-hidden group shadow-2xl">
                    <pre className="text-[10px] text-neutral-400 font-mono overflow-x-auto h-48 scrollbar-hide">
                        {repairSQL}
                    </pre>
                    <button
                        onClick={copySQL}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all backdrop-blur-md"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-neutral-900 to-transparent pointer-events-none" />
                </div>

                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => window.location.reload()}
                        variant="secondary"
                        className="mx-auto px-8 py-6 rounded-2xl font-bold"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Check Again
                    </Button>
                    <p className="text-[10px] text-neutral-400 italic">Reference: 20260210_data_control.sql</p>
                </div>
            </div>
        );
    }

    if (loading) return (
        <div className="p-20 text-center text-neutral-400 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="font-bold tracking-tight text-neutral-900">Loading Configuration...</span>
        </div>
    );

    return (
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
            {/* Header Title & Button bar */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight leading-tight">Governance Lock</h2>
                    <p className="hidden md:block text-xs text-neutral-500 mt-1">Enable data protection to prevent accidental modifications.</p>
                </div>
                <Button
                    onClick={saveSettings}
                    loading={saving}
                    icon={<Save className="w-4 h-4" />}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/25 px-5 md:px-8 h-11 md:h-12 !rounded-full font-bold transition-all active:scale-[0.98] shrink-0"
                >
                    <span className="tracking-tight text-sm md:text-base">Save Config</span>
                </Button>
            </div>

            {/* Grid of Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {GOVERNED_DOMAINS.map((domain) => {
                    const isLocked = !!locks[`${domain.domain}:${domain.sub_domain}`];
                    return (
                        <div
                            key={domain.id}
                            onClick={() => toggleLocal(domain.domain, domain.sub_domain)}
                            className={clsx(
                                "p-6 rounded-[32px] border transition-all cursor-pointer group hover:shadow-xl active:scale-[0.98] relative",
                                isLocked ? "bg-red-50/50 border-red-100 ring-4 ring-red-50/10" : "bg-white border-neutral-200 hover:border-neutral-300"
                            )}
                        >
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={clsx(
                                            "text-[10px] font-black uppercase tracking-[0.2em]",
                                            isLocked ? "text-red-600" : "text-blue-600"
                                        )}>
                                            {domain.category}
                                        </span>
                                        <div className={clsx("w-1 h-1 rounded-full", isLocked ? "bg-red-500" : "bg-neutral-200")} />
                                    </div>
                                    <h4 className="font-bold text-neutral-900 tracking-tight text-lg">{domain.label}</h4>
                                    <p className="text-xs text-neutral-500 leading-relaxed pr-8">
                                        {domain.desc}
                                    </p>
                                </div>

                                <div className={clsx(
                                    "w-10 h-10 rounded-2xl flex items-center justify-center transition-all absolute top-6 right-6",
                                    isLocked ? "bg-red-100 text-red-600" : "bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200"
                                )}>
                                    {isLocked ? <Lock className="w-5 h-5 fill-red-600/10" /> : <Unlock className="w-5 h-5" />}
                                </div>
                            </div>

                            <div className="mt-8 flex items-center justify-between">
                                <span className={clsx(
                                    "text-[10px] font-bold uppercase tracking-wider",
                                    isLocked ? "text-red-600" : "text-neutral-400"
                                )}>
                                    {isLocked ? "Protected" : "Unlocked"}
                                </span>
                                <div className={clsx(
                                    "w-9 h-5 rounded-full relative transition-colors p-0.5 shadow-inner border",
                                    isLocked ? "bg-red-500 border-red-500" : "bg-white border-neutral-200"
                                )}>
                                    <div className={clsx(
                                        "w-3.5 h-3.5 rounded-full transition-all shadow-sm",
                                        isLocked ? "bg-white translate-x-4" : "bg-neutral-300 translate-x-0"
                                    )} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Warning Footer */}
            <div className="bg-amber-50 border border-amber-100 rounded-[32px] p-6 flex gap-4 max-w-3xl">
                <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                    <h5 className="font-bold text-amber-900 text-sm">Governance Safety Protocol</h5>
                    <p className="text-xs text-amber-800/70 leading-relaxed mt-0.5">
                        Locking these domains will immediately disable all **Add, Edit, and Archive** actions in the respective setup modules for all users. This ensures configuration immutability until explicitly unlocked by an administrator.
                    </p>
                </div>
            </div>
        </div>
    );
}
