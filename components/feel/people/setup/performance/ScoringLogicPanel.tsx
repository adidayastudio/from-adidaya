"use client";

import { useEffect, useState } from "react";
import { Info, Calculator, Save, AlertCircle, CheckCircle2, AlertTriangle, Clock, CheckSquare, Star, Users, Briefcase } from "lucide-react";
import { fetchCurrentPerformanceRule, savePerformanceRule, PerformanceRule } from "@/lib/api/performance";
import { toast } from "react-hot-toast";
import { Button } from "@/shared/ui/primitives/button/button";

interface ScoringParams {
    attendance: {
        late_penalty: number;
        max_late_penalty: number;
    };
    task_quality: {
        revision_deduction: number;
        max_deduction: number;
    };
}

const DEFAULT_PARAMS: ScoringParams = {
    attendance: {
        late_penalty: 2,
        max_late_penalty: 20
    },
    task_quality: {
        revision_deduction: 5,
        max_deduction: 30
    }
};

export default function ScoringLogicPanel({ isLocked }: { isLocked?: boolean }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rule, setRule] = useState<PerformanceRule | null>(null);
    const [params, setParams] = useState<ScoringParams>(DEFAULT_PARAMS);

    useEffect(() => {
        loadRule();
    }, []);

    const loadRule = async () => {
        try {
            setLoading(true);
            const data = await fetchCurrentPerformanceRule();
            setRule(data);
            if (data?.scoring_params) {
                // Merge with defaults to ensure structure exists
                setParams({
                    attendance: { ...DEFAULT_PARAMS.attendance, ...data.scoring_params.attendance },
                    task_quality: { ...DEFAULT_PARAMS.task_quality, ...data.scoring_params.task_quality }
                });
            }
        } catch (error) {
            console.error("Error loading rules:", error);
            toast.error("Failed to load scoring rules");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!rule) return;

        try {
            setSaving(true);
            await savePerformanceRule({
                ...rule,
                scoring_params: params
            });
            toast.success("Scoring logic updated successfully", {
                style: {
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    color: '#065f46',
                    fontWeight: 500,
                }
            });
            // Refresh logic to ensure sync
            loadRule();
        } catch (error) {
            console.error("Error saving rules:", JSON.stringify(error, null, 2));
            toast.error(`Failed to update: ${(error as any)?.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-neutral-500 animate-pulse">Loading configuration...</div>;
    }

    return (
        <div className="mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Intro */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100/50 rounded-2xl p-6 shadow-sm">
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <Calculator className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-blue-900">Scoring Calculation Logic</h3>
                        <p className="text-sm text-blue-700 mt-1 leading-relaxed max-w-3xl">
                            Configure the specific deductions and penalties used to calculate the granular metrics.
                            These values determine how raw data (e.g., minutes late, number of revisions) translates into a verified score.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Attendance Configuration */}
                <div className="bg-white/50 backdrop-blur-sm border border-neutral-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-neutral-900">Attendance Scoring</h4>
                            <p className="text-xs text-neutral-500">Impact of lateness on attendance score</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                            <div className="flex justify-between items-start mb-2">
                                <label className="text-sm font-semibold text-neutral-700">Late Penalty</label>
                                <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Per Occurrence</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        value={params.attendance.late_penalty}
                                        onChange={(e) => setParams(prev => ({
                                            ...prev,
                                            attendance: { ...prev.attendance, late_penalty: parseFloat(e.target.value) || 0 }
                                        }))}
                                        className="w-full pl-3 pr-12 py-2 bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-semibold text-neutral-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-neutral-50"
                                        disabled={isLocked}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">PTS</span>
                                </div>
                                <div className="text-xs text-neutral-500 w-1/2 leading-tight">
                                    Points deducted from Attendance Score for each late arrival.
                                </div>
                            </div>
                        </div>

                        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                            <div className="flex justify-between items-start mb-2">
                                <label className="text-sm font-semibold text-neutral-700">Max Late Penalty</label>
                                <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Cap Limit</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        value={params.attendance.max_late_penalty}
                                        onChange={(e) => setParams(prev => ({
                                            ...prev,
                                            attendance: { ...prev.attendance, max_late_penalty: parseFloat(e.target.value) || 0 }
                                        }))}
                                        className="w-full pl-3 pr-12 py-2 bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-semibold text-neutral-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-neutral-50"
                                        disabled={isLocked}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">%</span>
                                </div>
                                <div className="text-xs text-neutral-500 w-1/2 leading-tight">
                                    Maximum total deduction allowed for lateness in a single period.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quality Configuration */}
                <div className="bg-white/50 backdrop-blur-sm border border-neutral-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                            <CheckSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-neutral-900">Task Quality Scoring</h4>
                            <p className="text-xs text-neutral-500">Impact of revisions on quality score</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                            <div className="flex justify-between items-start mb-2">
                                <label className="text-sm font-semibold text-neutral-700">Revision Deduction</label>
                                <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Per Revision</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        value={params.task_quality.revision_deduction}
                                        onChange={(e) => setParams(prev => ({
                                            ...prev,
                                            task_quality: { ...prev.task_quality, revision_deduction: parseFloat(e.target.value) || 0 }
                                        }))}
                                        className="w-full pl-3 pr-12 py-2 bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-semibold text-neutral-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-neutral-50"
                                        disabled={isLocked}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">PTS</span>
                                </div>
                                <div className="text-xs text-neutral-500 w-1/2 leading-tight">
                                    Points deducted from Quality Score for each required revision.
                                </div>
                            </div>
                        </div>

                        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                            <div className="flex justify-between items-start mb-2">
                                <label className="text-sm font-semibold text-neutral-700">Max Deduction Cap</label>
                                <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Safety Net</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        value={params.task_quality.max_deduction}
                                        onChange={(e) => setParams(prev => ({
                                            ...prev,
                                            task_quality: { ...prev.task_quality, max_deduction: parseFloat(e.target.value) || 0 }
                                        }))}
                                        className="w-full pl-3 pr-12 py-2 bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-semibold text-neutral-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-neutral-50"
                                        disabled={isLocked}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">%</span>
                                </div>
                                <div className="text-xs text-neutral-500 w-1/2 leading-tight">
                                    Maximum percentage that can be deducted from the total Quality Score.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Formula Visualization */}
            <div className="bg-slate-50 rounded-2xl p-8 shadow-sm border border-slate-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-all duration-700"></div>

                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                        <span className="text-slate-500 font-mono text-sm">fx</span>
                    </div>
                    <h3 className="text-slate-900 font-bold text-lg">Total Score Calculation</h3>
                </div>

                <div className="font-mono text-sm md:text-base space-y-3 relative z-10">
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                        <span className="opacity-70">Total_Score =</span>
                    </div>

                    <div className="pl-4 md:pl-8 space-y-2">
                        <div className="flex items-center gap-2 transition-all hover:translate-x-1 duration-200">
                            <span className="text-slate-400">(</span>
                            <span className="text-orange-700 font-medium">Attendance_Rate</span>
                            <span className="text-slate-400">*</span>
                            <span className="text-slate-900 font-bold">{rule?.weight_attendance || 0}%</span>
                            <span className="text-slate-400">)</span>
                            <span className="text-slate-400 font-light">+</span>
                            <span className="text-xs text-slate-500 ml-2 italic">// Derived from present days - ({params.attendance.late_penalty}pts * lates)</span>
                        </div>

                        <div className="flex items-center gap-2 transition-all hover:translate-x-1 duration-200">
                            <span className="text-slate-400">(</span>
                            <span className="text-blue-700 font-medium">Completion_Rate</span>
                            <span className="text-slate-400">*</span>
                            <span className="text-slate-900 font-bold">{rule?.weight_task_completion || 0}%</span>
                            <span className="text-slate-400">)</span>
                            <span className="text-slate-400 font-light">+</span>
                            <span className="text-xs text-slate-500 ml-2 italic">// (Completed / Assigned) * 100</span>
                        </div>

                        <div className="flex items-center gap-2 transition-all hover:translate-x-1 duration-200">
                            <span className="text-slate-400">(</span>
                            <span className="text-emerald-700 font-medium">Quality_Score</span>
                            <span className="text-slate-400">*</span>
                            <span className="text-slate-900 font-bold">{rule?.weight_task_quality || 0}%</span>
                            <span className="text-slate-400">)</span>
                            <span className="text-slate-400 font-light">+</span>
                            <span className="text-xs text-slate-500 ml-2 italic">// 100 - ({params.task_quality.revision_deduction}pts * revisions)</span>
                        </div>

                        <div className="flex items-center gap-2 transition-all hover:translate-x-1 duration-200">
                            <span className="text-slate-400">(</span>
                            <span className="text-indigo-700 font-medium">Peer_Review</span>
                            <span className="text-slate-400">*</span>
                            <span className="text-slate-900 font-bold">{rule?.weight_peer_review || 0}%</span>
                            <span className="text-slate-400">)</span>
                            <span className="text-slate-400 font-light">+</span>
                            <span className="text-xs text-slate-500 ml-2 italic">// Normalized 1-5 rating to 0-100 scale</span>
                        </div>

                        {rule?.overtime_bonus_enabled && (
                            <div className="flex items-center gap-2 transition-all hover:translate-x-1 duration-200">
                                <span className="text-purple-700 font-medium">Overtime_Bonus</span>
                                <span className="text-xs text-slate-500 ml-2 italic">// Capped at {rule.overtime_max_bonus}% of Total Score</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end pt-4">
                <Button
                    onClick={handleSave}
                    disabled={saving || isLocked}
                    className="bg-blue-600/90 hover:bg-blue-600 text-white px-8 shadow-lg shadow-blue-500/30 backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                    icon={<Save className="w-4 h-4" />}
                >
                    {saving ? 'Saving...' : isLocked ? 'Governance Locked' : 'Save Configuration'}
                </Button>
            </div>
        </div>
    );
}
