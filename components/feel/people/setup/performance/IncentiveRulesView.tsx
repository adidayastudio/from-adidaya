"use client";

import { useEffect, useState } from "react";
import { fetchIncentiveRoles, saveIncentiveRole, deleteIncentiveRole, IncentiveRoleWeight, fetchCurrentPerformanceRule, savePerformanceRule, PerformanceRule, fetchIncentiveLevelRanges, ProjectIncentiveLevelRange, upsertIncentiveLevelRange } from "@/lib/api/performance";
import { fetchLevels } from "@/lib/api/organization";
import { OrganizationLevel } from "@/lib/types/organization";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Save, Diamond, Briefcase, Pencil, AlertTriangle, X, ChevronDown } from "lucide-react";
import { toast } from "react-hot-toast";

export default function IncentiveRulesView({ isLocked }: { isLocked?: boolean }) {
    // const [roles, setRoles] = useState<IncentiveRoleWeight[]>([]); // Removed
    const [levels, setLevels] = useState<OrganizationLevel[]>([]);
    const [levelRanges, setLevelRanges] = useState<ProjectIncentiveLevelRange[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingRules, setSavingRules] = useState(false);

    // Global Rule State
    const [rule, setRule] = useState<PerformanceRule | null>(null);
    const [allocations, setAllocations] = useState({
        project: 90,
        performance: 10
    });

    // Level Range Edit State
    const [editingRange, setEditingRange] = useState<ProjectIncentiveLevelRange | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [ruleData, levelsData, rangesData] = await Promise.all([
                // fetchIncentiveRoles(), // Removed
                fetchCurrentPerformanceRule(),
                fetchLevels(),
                fetchIncentiveLevelRanges()
            ]);

            // Sort ranges to match the order of levels
            const sortedRanges = (rangesData || []).sort((a, b) => {
                const indexA = (levelsData || []).findIndex(l => l.code && l.code.includes(a.level_code));
                const indexB = (levelsData || []).findIndex(l => l.code && l.code.includes(b.level_code));

                // Keep unmatched items at the end
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;

                return indexA - indexB;
            });

            // setRoles(rolesData || []); // Removed
            setRule(ruleData);
            setLevels(levelsData || []);
            setLevelRanges(sortedRanges);

            if (ruleData) {
                setAllocations({
                    project: ruleData.incentive_allocation_project ?? 90,
                    performance: ruleData.incentive_allocation_performance ?? 10
                });
            }
        } catch (error) {
            console.error("Failed to load data", error);
            toast.error("Failed to load configuration");
        } finally {
            setLoading(false);
        }
    };

    const handleAllocationChange = (type: 'project' | 'performance', value: string) => {
        const numVal = parseInt(value) || 0;
        if (numVal < 0 || numVal > 100) return;

        if (type === 'project') {
            setAllocations({
                project: numVal,
                performance: 100 - numVal
            });
        } else {
            setAllocations({
                project: 100 - numVal,
                performance: numVal
            });
        }
    };

    const handleSaveAllocations = async () => {
        if (!rule) return;
        const loadingToast = toast.loading("Saving distribution rules...");
        try {
            setSavingRules(true);
            await savePerformanceRule({
                ...rule,
                incentive_allocation_project: allocations.project,
                incentive_allocation_performance: allocations.performance
            });
            toast.success("Distribution policy updated", {
                id: loadingToast,
                style: {
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    color: '#065f46',
                    fontWeight: 500,
                }
            });
        } catch (error) {
            console.error("Failed to save rules", error);
            toast.error("Failed to save distribution rules", {
                id: loadingToast,
                style: {
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#991b1b',
                }
            });
        } finally {
            setSavingRules(false);
        }
    };

    const handleEditRange = (range: ProjectIncentiveLevelRange) => {
        setEditingRange({ ...range });
    };

    const handleSaveRange = async () => {
        if (!editingRange) return;
        const loadingToast = toast.loading("Updating level limits...");
        try {
            await upsertIncentiveLevelRange(editingRange);
            toast.success("Level contribution limits updated", {
                id: loadingToast,
                style: {
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    color: '#065f46',
                    fontWeight: 500,
                }
            });
            setEditingRange(null);
            loadData(); // Refresh to ensure sync
        } catch (error) {
            console.error("Failed to update range", error);
            toast.error("Failed to update limits", {
                id: loadingToast,
                style: {
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#991b1b',
                }
            });
        }
    };

    // Helper to find level name
    const getLevelName = (code: string) => {
        // Strict match on code only to avoid "PR" matching "Probation" name
        // The level code from DB (levels) usually contains the short code like "007 VII PR"
        const match = levels.find(l => l.code && l.code.includes(code));
        return match ? match.name : "Unknown Level";
    };

    if (loading) {
        return <div className="p-8 text-center text-neutral-500 animate-pulse">Loading settings...</div>;
    }

    return (
        <div className="mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* SECTION 1: GLOBAL SPLIT */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-8 shadow-sm relative overflow-hidden">
                {/* ... (content omitted for brevity, same as before) ... */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="flex gap-5 mb-8 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-sm border border-indigo-50">
                        <Diamond className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-indigo-900">Incentive Distribution Policy</h3>
                        <p className="text-sm text-indigo-700/80 mt-1 leading-relaxed max-w-3xl">
                            Configure the baseline split for any project incentive pool. This policy acts as the global default for how project bonuses are divided between direct contribution and individual performance score.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 pl-2 md:pl-16">
                    <div className="flex flex-col md:flex-row gap-10 items-center">
                        <div className="flex-1 w-full space-y-2">
                            <label className="text-xs font-bold text-indigo-800 uppercase tracking-widest flex justify-between">
                                <span>Project Contribution</span>
                                <span className="text-indigo-400/80 font-mono">VARIABLE</span>
                            </label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    value={allocations.project}
                                    onChange={(e) => handleAllocationChange('project', e.target.value)}
                                    disabled={isLocked}
                                    className="w-full text-5xl font-black text-indigo-700 bg-transparent border-b-2 border-indigo-200 focus:border-indigo-500 outline-none py-2 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-indigo-200"
                                />
                                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xl font-bold text-indigo-300">%</span>
                            </div>
                            <p className="text-xs text-indigo-600/70 font-medium">Distributed based on Role Weight & Time Spent.</p>
                        </div>

                        <div className="hidden md:flex flex-col items-center justify-center text-indigo-300 gap-2 pt-6">
                            <div className="w-px h-8 bg-indigo-200/60"></div>
                            <span className="font-mono font-bold text-lg text-indigo-400">+</span>
                            <div className="w-px h-8 bg-indigo-200/60"></div>
                        </div>

                        <div className="flex-1 w-full space-y-2">
                            <label className="text-xs font-bold text-emerald-800 uppercase tracking-widest flex justify-between">
                                <span>Performance Score</span>
                                <span className="text-emerald-500/80 font-mono">FIXED BONUS</span>
                            </label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    value={allocations.performance}
                                    onChange={(e) => handleAllocationChange('performance', e.target.value)}
                                    disabled={isLocked}
                                    className="w-full text-5xl font-black text-emerald-600 bg-transparent border-b-2 border-emerald-200 focus:border-emerald-500 outline-none py-2 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-emerald-200"
                                />
                                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xl font-bold text-emerald-300">%</span>
                            </div>
                            <p className="text-xs text-emerald-600/70 font-medium">Bonus based on individual's review score.</p>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-indigo-100/50 flex justify-end">
                        <Button
                            onClick={handleSaveAllocations}
                            disabled={savingRules || isLocked}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                            icon={<Save className="w-4 h-4" />}
                        >
                            {savingRules ? 'Saving...' : isLocked ? 'Governance Locked' : 'Save Policy'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* SECTION 2: CONTRIBUTION LIMITS */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-neutral-900">Contribution Limits by Level</h3>
                        </div>
                        <p className="text-sm text-neutral-500 pl-14 max-w-2xl">
                            System-defined allowable contribution ranges and payout caps per organization level.
                        </p>
                    </div>
                </div>

                <div className="hidden md:block overflow-hidden bg-white border border-neutral-200 rounded-xl shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-neutral-50 border-b border-neutral-200">
                            <tr>
                                <th className="px-6 py-4 w-[35%] uppercase text-xs font-bold tracking-wider text-neutral-500">Level</th>
                                <th className="px-6 py-4 w-[20%] uppercase text-xs font-bold tracking-wider text-neutral-500">Contribution Range</th>
                                <th className="px-6 py-4 w-[20%] uppercase text-xs font-bold tracking-wider text-neutral-500">Effective Payout Cap</th>
                                <th className="px-6 py-4 w-[15%] uppercase text-xs font-bold tracking-wider text-neutral-500">Redistribution Policy</th>
                                <th className="px-6 py-4 w-[10%] text-right uppercase text-xs font-bold tracking-wider text-neutral-500">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {levelRanges.map((range) => {
                                const levelName = getLevelName(range.level_code);
                                return (
                                    <tr key={range.id} className="group hover:bg-blue-50/10 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600 border border-neutral-200 shrink-0">
                                                    {range.level_code}
                                                </div>
                                                <span className="font-bold text-neutral-900">{levelName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-100 group-hover:bg-white text-neutral-700 border border-neutral-200 group-hover:border-blue-200 font-mono font-bold text-xs transition-colors">
                                                <span>{range.min_percent}%</span>
                                                <span className="text-neutral-400">–</span>
                                                <span>{range.max_percent}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {range.effective_cap_ratio < 1.0 ? (
                                                <div className="flex items-center gap-2 text-amber-600 font-bold text-sm bg-amber-50 px-3 py-1 rounded-full border border-amber-100 w-fit">
                                                    <span>{(range.effective_cap_ratio * 100)}% Max</span>
                                                    <AlertTriangle className="w-3 h-3" />
                                                </div>
                                            ) : (
                                                <span className="text-neutral-400 text-sm font-medium flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                                    100% (Full Share)
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {range.redistribution_target === 'UPWARD' ? (
                                                <div className="text-xs font-medium text-neutral-600 flex flex-col">
                                                    <span className="font-bold text-neutral-800">Redistribute Excess Upward</span>
                                                    <span className="text-neutral-400">To higher, uncapped levels</span>
                                                </div>
                                            ) : (
                                                <span className="text-neutral-400 text-xs italic">No redistribution required</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="text"
                                                size="sm"
                                                icon={<Pencil className="w-4 h-4 text-neutral-500" />}
                                                onClick={() => handleEditRange(range)}
                                                disabled={isLocked}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                            {levelRanges.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-400 italic">
                                        No level limits configured.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                    {levelRanges.map((range) => {
                        const levelName = getLevelName(range.level_code);
                        return (
                            <div
                                key={range.id}
                                onClick={() => handleEditRange(range)}
                                className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm active:scale-[0.99] active:bg-neutral-50 transition-all cursor-pointer relative overflow-hidden"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 border border-blue-100 shrink-0">
                                            {range.level_code}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-neutral-900 text-sm">{levelName}</span>
                                            <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Level Settings</span>
                                        </div>
                                    </div>
                                    {range.effective_cap_ratio < 1.0 && (
                                        <div className="flex items-center gap-1 text-amber-600 text-[10px] font-bold bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                            <AlertTriangle className="w-3 h-3" />
                                            <span>Cap: {range.effective_cap_ratio * 100}%</span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-100 flex flex-col items-center justify-center">
                                        <span className="text-[10px] uppercase text-neutral-400 font-bold mb-0.5">Range</span>
                                        <span className="text-sm font-black text-neutral-700 font-mono">
                                            {range.min_percent}% - {range.max_percent}%
                                        </span>
                                    </div>
                                    <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-100 flex flex-col items-center justify-center">
                                        <span className="text-[10px] uppercase text-neutral-400 font-bold mb-0.5">Policy</span>
                                        <span className="text-[11px] font-bold text-neutral-600 text-center leading-tight">
                                            {range.redistribution_target === 'UPWARD' ? 'Redistribute Up' : 'No Action'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* EDIT MODAL */}
            {editingRange && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white/85 backdrop-blur-xl rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-white/60">
                        {/* Modal Header */}
                        <div className="px-8 py-7 bg-white/40 border-b border-white/60 flex justify-between items-start backdrop-blur-md">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                                        <Briefcase className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-xl font-bold text-neutral-900 tracking-tight">
                                        Edit Contribution Limits
                                    </h4>
                                </div>
                                <p className="text-sm text-neutral-500 pl-[52px]">
                                    Updating rules for <span className="font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">{getLevelName(editingRange.level_code)} ({editingRange.level_code})</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingRange(null)}
                                className="text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 p-2 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 space-y-8">
                            {/* Range Inputs */}
                            <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100">
                                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest block text-center mb-6">Allowable Contribution Range</label>
                                <div className="flex items-center justify-center gap-6">
                                    <div className="w-32">
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={isNaN(editingRange.min_percent) ? '' : editingRange.min_percent}
                                                onChange={(e) => setEditingRange({ ...editingRange, min_percent: e.target.value === '' ? NaN : parseFloat(e.target.value) })}
                                                className="w-full text-center text-3xl font-black text-neutral-800 bg-transparent border-b-2 border-neutral-200 focus:border-blue-500 outline-none py-2 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-neutral-200"
                                            />
                                            <span className="absolute top-0 right-2 text-sm font-bold text-neutral-400 mt-3">%</span>
                                        </div>
                                        <label className="text-[10px] font-bold text-neutral-400 text-center block mt-3 uppercase tracking-wide">Minimum</label>
                                    </div>

                                    <div className="flex flex-col gap-1 items-center justify-center pb-6 opacity-30">
                                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-400"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-400"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-400"></div>
                                    </div>

                                    <div className="w-32">
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={isNaN(editingRange.max_percent) ? '' : editingRange.max_percent}
                                                onChange={(e) => setEditingRange({ ...editingRange, max_percent: e.target.value === '' ? NaN : parseFloat(e.target.value) })}
                                                className="w-full text-center text-3xl font-black text-blue-600 bg-transparent border-b-2 border-blue-200 focus:border-blue-500 outline-none py-2 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-blue-200"
                                            />
                                            <span className="absolute top-0 right-2 text-sm font-bold text-blue-300 mt-3">%</span>
                                        </div>
                                        <label className="text-[10px] font-bold text-blue-600/60 text-center block mt-3 uppercase tracking-wide">Maximum</label>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wide block">Effective Payout Cap</label>
                                    <div className="relative group">
                                        <div className="flex items-center w-full h-12 !p-1.5 bg-white border border-neutral-200 !rounded-full transition-all focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 shadow-sm overflow-hidden gap-2">
                                            {/* Icon Section - Always 1.5 away from edges */}
                                            <div className="w-9 h-9 !rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                                                <AlertTriangle className={`w-4 h-4 ${editingRange.effective_cap_ratio < 1 ? 'text-amber-500' : 'text-neutral-400'}`} />
                                            </div>

                                            {/* Input Section - Clear 0-100% scale input */}
                                            <div className="flex-grow flex items-center pl-2 pr-4 relative">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={isNaN(editingRange.effective_cap_ratio) ? '' : Math.round(editingRange.effective_cap_ratio * 100)}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        const numVal = val === '' ? NaN : parseInt(val);
                                                        if (!isNaN(numVal) && numVal > 100) return; // Cap at 100
                                                        setEditingRange({ ...editingRange, effective_cap_ratio: isNaN(numVal) ? NaN : numVal / 100 });
                                                    }}
                                                    className="w-full bg-transparent outline-none font-bold text-lg text-neutral-800 placeholder-neutral-300 pr-10"
                                                    placeholder="100"
                                                />
                                                <span className="absolute right-3 text-neutral-400 font-bold opacity-60">%</span>
                                            </div>

                                            {/* Badge Section - Simplified info badge */}
                                            {editingRange.effective_cap_ratio < 1.0 && (
                                                <div className="h-9 px-4 !rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-[10px] font-black text-amber-600 uppercase tracking-tight shadow-sm whitespace-nowrap shrink-0">
                                                    LIMITED SHARE ({(editingRange.effective_cap_ratio * 100).toFixed(0)}%)
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-neutral-400 leading-relaxed pl-1">
                                        Set to <strong className="text-neutral-600">100%</strong> for full payout entitlement. Lower values limit the incentive share.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wide block">Redistribution Policy</label>
                                    <div className="relative">
                                        <select
                                            className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-neutral-200 !rounded-full focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-bold text-neutral-700 transition-all hover:border-blue-200 shadow-sm cursor-pointer"
                                            value={editingRange.redistribution_target || 'NONE'}
                                            onChange={(e) => setEditingRange({ ...editingRange, redistribution_target: e.target.value })}
                                        >
                                            <option value="NONE" className="py-2">No Redistribution</option>
                                            <option value="UPWARD" className="py-2">Upward (to Higher Levels)</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                                            <ChevronDown className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-neutral-400 leading-relaxed pl-1">
                                        Determines where any excess capped share is re-routed.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-7 bg-white/40 border-t border-white/60 flex justify-between items-center backdrop-blur-md">
                            <Button
                                variant="text"
                                onClick={() => setEditingRange(null)}
                                className="text-neutral-500 hover:text-neutral-900 hover:bg-white/50 font-bold px-8 py-2 rounded-full transition-all active:scale-95"
                            >
                                Cancel
                            </Button>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0_8px_24px_-4px_rgba(37,99,235,0.4)] !rounded-full px-12 py-6 font-black tracking-tight transition-all hover:scale-[1.05] active:scale-[0.95]"
                                onClick={handleSaveRange}
                                icon={<Save className="w-5 h-5" strokeWidth={2.5} />}
                            >
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
