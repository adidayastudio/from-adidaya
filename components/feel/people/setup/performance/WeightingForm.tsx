"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Save, Lock, Unlock, Percent } from "lucide-react";
import { fetchCurrentPerformanceRule, savePerformanceRule, type PerformanceRule } from "@/lib/api/performance";
import { toast, Toaster } from "react-hot-toast";

export default function WeightingForm({ isLocked, rule, ruleLoading, onRuleUpdate }: { isLocked?: boolean, rule?: PerformanceRule | null, ruleLoading?: boolean, onRuleUpdate?: () => void }) {
    // Core weights state
    const [weights, setWeights] = useState({
        attendance: 25,
        taskCompletion: 25,
        taskQuality: 25,
        peerReview: 25,
        includeOvertime: false,
        overtimeMaxBonus: 10
    });

    // UI state for locked sliders (prevent them from changing during auto-balance)
    const [locked, setLocked] = useState<{ [key: string]: boolean }>({
        attendance: false,
        taskCompletion: false,
        taskQuality: false,
        peerReview: false
    });

    const [loading, setLoading] = useState(false);

    // Sync with rule prop
    useEffect(() => {
        if (rule) {
            setWeights({
                attendance: rule.weight_attendance,
                taskCompletion: rule.weight_task_completion,
                taskQuality: rule.weight_task_quality,
                peerReview: rule.weight_peer_review,
                includeOvertime: rule.overtime_bonus_enabled,
                overtimeMaxBonus: rule.overtime_max_bonus
            });
        }
    }, [rule]);

    // Fetch current configuration on mount ONLY if not provided via props (setup vs standalone)
    useEffect(() => {
        if (rule !== undefined) return; // Skip if parent manages data

        const loadRules = async () => {
            setLoading(true);
            try {
                const currentRule = await fetchCurrentPerformanceRule();
                if (currentRule) {
                    setWeights({
                        attendance: currentRule.weight_attendance,
                        taskCompletion: currentRule.weight_task_completion,
                        taskQuality: currentRule.weight_task_quality,
                        peerReview: currentRule.weight_peer_review,
                        includeOvertime: currentRule.overtime_bonus_enabled,
                        overtimeMaxBonus: currentRule.overtime_max_bonus
                    });
                }
            } catch (error) {
                console.error("Failed to load performance rules", error);
                toast.error("Failed to load existing configuration");
            } finally {
                setLoading(false);
            }
        };
        loadRules();
    }, [rule]);

    const handleReset = () => {
        setWeights({
            attendance: 25,
            taskCompletion: 25,
            taskQuality: 25,
            peerReview: 25,
            includeOvertime: false,
            overtimeMaxBonus: 10
        });
        setLocked({
            attendance: false,
            taskCompletion: false,
            taskQuality: false,
            peerReview: false
        });
        toast("Configuration reset to defaults", {
            icon: '↺',
            style: {
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                color: '#333',
            }
        });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Fetch latest to preserve other fields (period, etc.)
            const currentRule = await fetchCurrentPerformanceRule();

            const newRule: Partial<PerformanceRule> = {
                ...currentRule, // Keep existing settings
                weight_attendance: weights.attendance,
                weight_task_completion: weights.taskCompletion,
                weight_task_quality: weights.taskQuality,
                weight_peer_review: weights.peerReview,
                overtime_bonus_enabled: weights.includeOvertime,
                overtime_max_bonus: weights.includeOvertime ? weights.overtimeMaxBonus : 0
            };

            await savePerformanceRule(newRule);

            if (onRuleUpdate) onRuleUpdate();

            toast.success("Configuration saved successfully!", {
                duration: 4000,
                style: {
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    color: '#065f46',
                    fontWeight: 500,
                }
            });
        } catch (error: any) {
            console.error("Failed to save rules", error);
            toast.error(`Failed to save: ${error.message || "Unknown error"}`, {
                style: {
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#991b1b',
                }
            });
        } finally {
            setLoading(false);
        }
    };

    // Auto-balance logic
    const handleWeightChange = (key: string, newValue: number) => {
        // Clamp value between 0 and 100
        const clampedValue = Math.min(100, Math.max(0, newValue));

        // Calculate the delta needed
        const oldValue = weights[key as keyof typeof weights] as number;
        const delta = clampedValue - oldValue;

        if (delta === 0) return;

        // Find available redistribution targets (unlocked and not the current key)
        const targets = Object.keys(weights).filter(k =>
            ['attendance', 'taskCompletion', 'taskQuality', 'peerReview'].includes(k) &&
            k !== key &&
            !locked[k]
        );

        if (targets.length === 0) {
            // If all others are locked, we can't change this one unless we force break correct total
            // For this UI, strictly enforcing 100% means we just don't allow change if no targets
            return;
        }

        const newWeights = { ...weights, [key]: clampedValue };

        // Distribute the negative delta across targets
        let remainingDelta = -delta;

        // Simple equal distribution for smoothness
        // In a more complex version, we could weigh by current size, but equal is predictable
        const share = Math.floor(remainingDelta / targets.length);
        let remainder = remainingDelta % targets.length;

        targets.forEach((target, index) => {
            const currentTargetValue = weights[target as keyof typeof weights] as number;
            let adjustment = share;

            // Distribute remainder one by one
            if (remainder !== 0) {
                if (remainder > 0) { adjustment += 1; remainder -= 1; }
                else { adjustment -= 1; remainder += 1; }
            }

            // Apply tentative adjustment
            let newTargetValue = currentTargetValue + adjustment;

            // Clamp to ensure no negative weights (basic safety, though logic should hold)
            if (newTargetValue < 0) {
                // If we hit 0, we can't take more from this target.
                // This is a simplified balancer; rigorous one needs detailed waterfall.
                // For now, allow slight drift if user drags wildly, or clamp strictly.
                // Let's simplest approach: just set simplified values.
                newTargetValue = Math.max(0, newTargetValue);
            }
            newWeights[target as 'attendance' | 'taskCompletion' | 'taskQuality' | 'peerReview'] = newTargetValue;
        });

        // Final safety fix to ensure exactly 100 sum (catch rounding errors)
        const newSum = (newWeights.attendance + newWeights.taskCompletion + newWeights.taskQuality + newWeights.peerReview);
        const fixDelta = 100 - newSum;
        if (fixDelta !== 0 && targets.length > 0) {
            // Dump rounding error into the first available target
            const firstTarget = targets[0] as 'attendance' | 'taskCompletion' | 'taskQuality' | 'peerReview';
            newWeights[firstTarget] = (newWeights[firstTarget] as number) + fixDelta;
        }

        setWeights(newWeights);
    };

    const toggleLock = (key: string) => {
        setLocked(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="mx-auto bg-white/50 backdrop-blur-sm p-8 rounded-2xl border border-neutral-100 shadow-xl shadow-neutral-200/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-1">Performance Index Weighting</h3>
                    <p className="text-sm text-neutral-500">Smart-lock distribution ensuring 100% total.</p>
                </div>
                <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full font-bold text-sm border border-emerald-100 flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Total Locked: 100%
                </div>
            </div>

            <div className="space-y-6">
                {[
                    { id: 'attendance', label: 'Attendance & Punctuality', desc: 'Clock-in logs & punctuality' },
                    { id: 'taskCompletion', label: 'Task Completion Rate', desc: 'Tasks marked as Done' },
                    { id: 'taskQuality', label: 'Task Quality / Outcome', desc: 'Rework & revision ratio' },
                    { id: 'peerReview', label: 'Peer & 360 Review', desc: 'Team feedback score' }
                ].map((item) => (
                    <div key={item.id} className="group bg-white rounded-xl p-4 border border-neutral-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <label className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                                    {item.label}
                                    {locked[item.id] && <Lock className="w-3 h-3 text-neutral-400" />}
                                </label>
                                <p className="text-xs text-neutral-400 font-medium">{item.desc}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleLock(item.id)}
                                    className={`p-1.5 rounded-lg transition-colors ${locked[item.id] ? 'bg-neutral-100 text-neutral-500' : 'text-neutral-300 hover:text-neutral-500 hover:bg-neutral-50'} disabled:opacity-50`}
                                    disabled={isLocked}
                                >
                                    {locked[item.id] ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                </button>
                                <div className="relative w-24">
                                    <input
                                        type="number"
                                        value={weights[item.id as keyof typeof weights] as number}
                                        onChange={(e) => handleWeightChange(item.id, parseInt(e.target.value) || 0)}
                                        className={`w-full pl-3 pr-8 py-1.5 text-right font-bold text-sm rounded-lg border-2 transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${locked[item.id]
                                            ? 'bg-neutral-100 text-neutral-400 border-transparent cursor-not-allowed'
                                            : 'bg-neutral-50 border-transparent hover:bg-white focus:bg-white focus:border-blue-500 text-neutral-900 shadow-sm'
                                            }`}
                                        disabled={locked[item.id] || isLocked}
                                    />
                                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold ${locked[item.id] ? 'text-neutral-400' : 'text-neutral-400'}`}>%</span>
                                </div>
                            </div>
                        </div>
                        <div className="relative h-6 w-full flex items-center">
                            {/* Track Background */}
                            <div className="absolute w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ease-out ${locked[item.id] ? 'bg-neutral-300' : 'bg-blue-600'
                                        }`}
                                    style={{ width: `${weights[item.id as keyof typeof weights]}%` }}
                                />
                            </div>

                            {/* Visible Thumb (Glassy Knob) */}
                            <div
                                className={`absolute h-5 w-5 rounded-full shadow-lg border-2 bg-white/90 backdrop-blur-sm transform -translate-x-1/2 transition-all duration-75 ease-out pointer-events-none z-20 ${locked[item.id] ? 'border-neutral-300 scale-90 opacity-80' : 'border-blue-500 ring-2 ring-blue-200'
                                    }`}
                                style={{ left: `${weights[item.id as keyof typeof weights]}%` }}
                            />

                            {/* Actual Input (Invisible Overlay) */}
                            <input
                                type="range"
                                className={`absolute w-full h-full opacity-0 z-30 ${locked[item.id] ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                min="0" max="100"
                                value={weights[item.id as keyof typeof weights] as number}
                                onChange={(e) => handleWeightChange(item.id, parseInt(e.target.value))}
                                disabled={locked[item.id] || isLocked}
                            />
                        </div>
                    </div>
                ))}

                {/* Overtime Bonus Section */}
                <div className="mt-8 pt-6 border-t border-neutral-100">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-xl border border-blue-100/50">
                        <div className="flex-1">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className={`w-12 h-7 flex items-center rounded-full p-1 duration-300 ease-in-out shadow-inner shrink-0 ${weights.includeOvertime ? 'bg-blue-600' : 'bg-gray-200'}`}>
                                    <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ease-in-out ${weights.includeOvertime ? 'translate-x-5' : ''}`}></div>
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={weights.includeOvertime}
                                    onChange={(e) => setWeights({ ...weights, includeOvertime: e.target.checked })}
                                    disabled={isLocked}
                                />
                                <div>
                                    <span className="block text-sm font-bold text-neutral-900">Verified Overtime Bonus</span>
                                    <span className="block text-xs text-neutral-500">Enable bonus points for verified overtime hours</span>
                                </div>
                            </label>
                        </div>

                        {weights.includeOvertime && (
                            <div className="flex items-center gap-2 pl-4 border-l border-blue-200">
                                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide whitespace-nowrap hidden md:block">Max Cap</span>
                                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide whitespace-nowrap md:hidden">Cap</span>
                                <div className="relative w-20 md:w-24">
                                    <input
                                        type="number"
                                        value={weights.overtimeMaxBonus}
                                        onChange={(e) => setWeights({ ...weights, overtimeMaxBonus: parseInt(e.target.value) || 0 })}
                                        className="w-full pl-3 pr-8 py-1.5 text-right font-bold text-blue-700 bg-white rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-neutral-50"
                                        disabled={isLocked}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-400">%</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                    <Button
                        variant="secondary"
                        className="hover:bg-neutral-100"
                        onClick={handleReset}
                        disabled={isLocked}
                    >
                        Reset to Default
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading || isLocked}
                        className="bg-blue-600/90 hover:bg-blue-600 text-white px-8 shadow-lg shadow-blue-500/30 backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                        icon={<Save className="w-4 h-4" />}
                    >
                        {loading ? 'Saving...' : isLocked ? 'Governance Locked' : 'Save Configuration'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
