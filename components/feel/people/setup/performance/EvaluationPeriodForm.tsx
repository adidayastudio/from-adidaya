"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Lock, AlertCircle, Calendar, Save, Clock } from "lucide-react";
import { fetchCurrentPerformanceRule, savePerformanceRule, type PerformanceRule } from "@/lib/api/performance";
import { toast } from "react-hot-toast";

export default function EvaluationPeriodForm({ isLocked, rule, ruleLoading, onRuleUpdate }: { isLocked?: boolean, rule?: PerformanceRule | null, ruleLoading?: boolean, onRuleUpdate?: () => void }) {
    // Evaluation Period Configuration
    const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
    const [snapshotDay, setSnapshotDay] = useState<string>('last'); // '1', '15', 'last' or 'monday', 'friday'
    const [autoLock, setAutoLock] = useState(true);
    const [loading, setLoading] = useState(false);

    // New: Effective Start Date & Time
    const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString());

    // Helper to split ISO string into date and time for inputs
    const getDateString = () => {
        if (!effectiveDate) return '';
        return effectiveDate.split('T')[0];
    };

    const getTimeString = () => {
        if (!effectiveDate) return '00:00';
        const timePart = effectiveDate.split('T')[1];
        return timePart ? timePart.substring(0, 5) : '00:00';
    };

    const handleDateChange = (newDate: string) => {
        const currentTime = getTimeString();
        setEffectiveDate(`${newDate}T${currentTime}:00.000Z`);
    };

    const handleTimeChange = (newTime: string) => {
        const currentDate = getDateString();
        setEffectiveDate(`${currentDate}T${newTime}:00.000Z`);
    };


    // Sync with Rule Prop
    useEffect(() => {
        if (rule) {
            setPeriod(rule.period_type);
            setSnapshotDay(rule.snapshot_day_trigger);
            setAutoLock(rule.auto_lock_enabled);
            setEffectiveDate(new Date().toISOString()); // Default to now for new edits
        }
    }, [rule]);

    // Load existing settings (Fallback if no prop)
    useEffect(() => {
        if (rule !== undefined) return;

        const loadRules = async () => {
            setLoading(true);
            try {
                const currentRule = await fetchCurrentPerformanceRule();
                console.log("Fetched current rule:", currentRule);
                if (currentRule) {
                    setPeriod(currentRule.period_type);
                    setSnapshotDay(currentRule.snapshot_day_trigger);
                    setAutoLock(currentRule.auto_lock_enabled);
                    // Default to NOW for new edits, rather than the old rule's start date
                    // This prevents confusion where saving creates a rule with an old date that might be shadowed
                    setEffectiveDate(new Date().toISOString());
                } else {
                    setEffectiveDate(new Date().toISOString());
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

    const handleSave = async () => {
        setLoading(true);
        // Optimistic Toast with ID
        const loadingToast = toast.loading("Saving configuration...");

        try {
            // Fetch latest to preserve weighting fields if any
            const currentRule = await fetchCurrentPerformanceRule();

            // Explicit fallback if currentRule is null (no rules yet)
            const baseRule = currentRule || {};

            const newRule: Partial<PerformanceRule> = {
                ...baseRule,
                period_type: period,
                snapshot_day_trigger: snapshotDay,
                auto_lock_enabled: autoLock,
                effective_start_date: effectiveDate, // Use user-selected effective date
                is_active: true
            };

            await savePerformanceRule(newRule);

            if (onRuleUpdate) onRuleUpdate();

            // Reload to verify persistence - Optional if onRuleUpdate does it
            // const savedRule = await fetchCurrentPerformanceRule();
            // console.log("Verified Save:", savedRule);

            toast.success("Evaluation cycle updated", {
                id: loadingToast,
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
            console.error("Failed to save evaluation period", error);
            toast.error(`Failed: ${error.message || "Unknown error"}`, {
                id: loadingToast,
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

    const handlePeriodChange = (newPeriod: 'weekly' | 'monthly') => {
        setPeriod(newPeriod);
        // Reset trigger defaults based on period
        if (newPeriod === 'weekly') setSnapshotDay('friday');
        else setSnapshotDay('last');
    };

    return (
        <div className="mx-auto bg-white/50 backdrop-blur-sm p-8 rounded-2xl border border-neutral-100 shadow-xl shadow-neutral-200/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-1">Evaluation Cycle</h3>
                    <p className="text-sm text-neutral-500">Configure when performance snapshots are automatically generated.</p>
                </div>

                {/* Compact Effective Date Configuration - Single Row Mobile */}
                <div className="bg-blue-50/50 p-2 md:p-3 rounded-xl border border-blue-100/50 flex flex-nowrap flex-row items-center gap-2 md:gap-3 overflow-hidden">
                    <div className="hidden md:flex items-center gap-2 text-xs font-bold text-blue-700 whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Effective Start:</span>
                    </div>
                    {/* Mobile Icon Only */}
                    <div className="md:hidden flex-none flex items-center justify-center bg-blue-100 rounded-lg p-2 text-blue-600">
                        <Clock className="w-4 h-4" />
                    </div>

                    <div className="flex flex-row items-center gap-2 w-full min-w-0">
                        <div className="relative flex-grow min-w-0">
                            <input
                                type="date"
                                className="w-full pl-2 pr-1 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                value={getDateString()}
                                onChange={(e) => handleDateChange(e.target.value)}
                                disabled={isLocked}
                            />
                        </div>
                        <div className="relative w-20 md:w-24 shrink-0">
                            <input
                                type="time"
                                className="w-full pl-2 pr-1 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                value={getTimeString()}
                                onChange={(e) => handleTimeChange(e.target.value)}
                                disabled={isLocked}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {/* Period Selection */}
                <div>
                    <label className="block text-sm font-bold text-neutral-900 mb-4">Period Type</label>
                    <div className="grid grid-cols-2 gap-6">
                        <div
                            onClick={() => !isLocked && handlePeriodChange("weekly")}
                            className={`group relative overflow-hidden p-6 rounded-2xl border-2 transition-all duration-300 ${isLocked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'} ${period === "weekly"
                                ? "bg-white border-blue-600 shadow-lg shadow-blue-500/10"
                                : "bg-white border-transparent hover:border-neutral-200 shadow-sm hover:shadow-md"
                                }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className={`text-lg font-bold ${period === "weekly" ? "text-blue-600" : "text-neutral-900"}`}>Weekly</span>
                                {period === "weekly" && <div className="w-3 h-3 rounded-full bg-blue-600 shadow-blue-500/50 shadow-sm" />}
                            </div>
                            <p className="text-sm text-neutral-500 leading-relaxed">
                                Snapshots generated every week. Best for fast-paced agile teams requiring frequent feedback loops.
                            </p>
                        </div>

                        <div
                            onClick={() => !isLocked && handlePeriodChange("monthly")}
                            className={`group relative overflow-hidden p-6 rounded-2xl border-2 transition-all duration-300 ${isLocked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'} ${period === "monthly"
                                ? "bg-white border-blue-600 shadow-lg shadow-blue-500/10"
                                : "bg-white border-transparent hover:border-neutral-200 shadow-sm hover:shadow-md"
                                }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className={`text-lg font-bold ${period === "monthly" ? "text-blue-600" : "text-neutral-900"}`}>Monthly</span>
                                {period === "monthly" && <div className="w-3 h-3 rounded-full bg-blue-600 shadow-blue-500/50 shadow-sm" />}
                            </div>
                            <p className="text-sm text-neutral-500 leading-relaxed">
                                Standard cycle. Aggregates data over calendar months. Ideal for stable, long-term project evaluations.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Snapshot Configuration - Flattened */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-neutral-900 mb-2">Snapshot Trigger Day</label>
                        <div className="relative max-w-md">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <select
                                className="w-full pl-10 pr-4 py-3 bg-neutral-50 hover:bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer appearance-none"
                                value={snapshotDay}
                                onChange={(e) => setSnapshotDay(e.target.value)}
                                disabled={isLocked}
                            >
                                {period === 'monthly' ? (
                                    <>
                                        <option value="1">1st of the month (Start)</option>
                                        <option value="15">15th of the month (Mid-month)</option>
                                        <option value="last">Last day of the month (End)</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="monday">Every Monday</option>
                                        <option value="friday">Every Friday</option>
                                        <option value="sunday">Every Sunday (End of week)</option>
                                    </>
                                )}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-100/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                                    <Lock className="w-4 h-4 text-blue-600" />
                                    Auto-lock after snapshot
                                </label>
                                <p className="text-xs text-neutral-500 mt-1 max-w-lg">
                                    Once a snapshot is taken, data for that period becomes immutable triggers. This ensures historical accuracy.
                                    <span className="block mt-1 font-medium text-blue-600 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> Data entered after snapshot will NOT be counted.
                                    </span>
                                </p>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-14 h-8 flex items-center rounded-full p-1 duration-300 ease-in-out shadow-inner transition-all ${autoLock ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-gray-200'}`}>
                                    <div className={`bg-white w-6 h-6 rounded-full shadow-md transform duration-300 ease-in-out ${autoLock ? 'translate-x-6' : ''}`}></div>
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={autoLock}
                                    onChange={(e) => setAutoLock(e.target.checked)}
                                    disabled={isLocked}
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="pt-6 flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={loading || isLocked}
                        className="bg-blue-600/90 hover:bg-blue-600 text-white px-8 shadow-lg shadow-blue-500/30 backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                        icon={<Save className="w-4 h-4" />}
                    >
                        {loading ? 'Saving...' : isLocked ? 'Governance Locked' : 'Save Settings'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
