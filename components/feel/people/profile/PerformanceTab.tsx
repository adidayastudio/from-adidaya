"use client";

import { useState, useEffect, useMemo } from "react";
import { Person } from "../types";
import { TrendingUp, Award, Clock, Target, AlertTriangle, Lock, Unlock, Activity } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import EditConfirmationModal from "../modals/EditConfirmationModal";
import { fetchPeopleFeedback, fetchPeoplePerformance, fetchTeamBenchmark } from "@/lib/api/people";
import { fetchCurrentPerformanceRule, calculateOverallIndex } from "@/lib/api/performance";
import { fetchAttendanceRecords } from "@/lib/api/clock";
import { calculateStats, calculateAdidayaScore } from "@/lib/clock-data-logic";
import { SpiderChart, PerformanceLineChart } from "./PerformanceHistoryCharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import useUserProfile from "@/hooks/useUserProfile";
import clsx from "clsx";

export default function PerformanceTab({ person, isSystem, isMe }: { person: Person, isSystem: boolean, isMe: boolean }) {
    const [isEditingOverride, setEditingOverride] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [manualScore, setManualScore] = useState("");

    const [feedback, setFeedback] = useState<any[]>([]);
    const [snapshots, setSnapshots] = useState<any[]>([]);
    const [benchmark, setBenchmark] = useState<any>(null);
    const [rule, setRule] = useState<any>(null);
    const [realtimeAttendance, setRealtimeAttendance] = useState<number | null>(null);
    const [timeFilter, setTimeFilter] = useState("3m");
    const [isLoading, setIsLoading] = useState(true);

    const { profile: currentUser } = useUserProfile();
    const isViewerAdmin = currentUser?.role === "admin" || currentUser?.role === "superadmin";

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // SEQUENTIAL FETCHING to reduce peak parallel requests
                const currentRule = await fetchCurrentPerformanceRule();
                setRule(currentRule);

                const fb = await fetchPeopleFeedback(person.id);
                setFeedback(fb);

                const snaps = await fetchPeoplePerformance(person.id);
                setSnapshots(snaps);

                // ADIDAYA OS RULE: Only LAST MONTH attendance is used for performance.
                // Current month is "Running".
                const today = new Date(); // Define today here
                const lastMonthDate = subMonths(today, 1);
                const lastMonthStart = format(startOfMonth(lastMonthDate), 'yyyy-MM-dd');
                const lastMonthEnd = format(endOfMonth(lastMonthDate), 'yyyy-MM-dd');
                const lastMonthPeriod = format(lastMonthDate, 'yyyy-MM-01');

                const [benchData, lastMonthRecords, currentMonthRecords] = await Promise.all([
                    fetchTeamBenchmark(lastMonthPeriod),
                    fetchAttendanceRecords(person.id, lastMonthStart, lastMonthEnd),
                    fetchAttendanceRecords(person.id, format(startOfMonth(today), 'yyyy-MM-dd'), format(endOfMonth(today), 'yyyy-MM-dd'))
                ]);

                setBenchmark(benchData?.[0]);

                // Calculate Last Month (Performance context)
                if (lastMonthRecords.length > 0) {
                    const config = {
                        late_penalty_per: rule?.scoring_params?.attendance?.late_penalty || 2,
                        late_penalty_cap: rule?.scoring_params?.attendance?.max_late_penalty || 20,
                        ot_bonus_cap: rule?.overtime_max_bonus || 10,
                        ot_target_value: rule?.ot_target_hours || 40 // DYNAMIC TARGET FROM SETUP
                    };

                    const res = calculateAdidayaScore(
                        lastMonthRecords.map(r => ({ ...r, employee: person.name, day: format(new Date(r.date), "EEE"), schedule: "-" })) as any,
                        config,
                        lastMonthDate
                    );
                    setRealtimeAttendance(res.attendance_score);
                } else {
                    setRealtimeAttendance(Number(snaps[0]?.attendance_score || 0));
                }

                // Calculate Current Month (Running/Visual context)
                if (currentMonthRecords.length > 0) {
                    // Logic for current month display...
                }
            } catch (error) {
                console.error("Error loading performance data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [person.id, person.name, rule]);

    const realtimeOverallIndex = useMemo(() => {
        // Fallback to static KPI if real-time calculation is impossible
        const fallbackScore = person.kpi.presenceScore;
        const currentAtt = realtimeAttendance !== null ? realtimeAttendance : fallbackScore;

        if (!rule) return null;

        const latest = snapshots[0] || {};
        const components = {
            attendance: currentAtt,
            taskCompletion: Number(latest.task_completion_score) || person.kpi.taskCompletionScore,
            taskQuality: Number(latest.quality_score) || person.kpi.qualityScore,
            peerReview: Number(latest.peer_review_score) || person.kpi.peerReviewScore
        };

        return calculateOverallIndex(components, rule);
    }, [realtimeAttendance, rule, snapshots, person.kpi]);

    const filteredHistory = useMemo(() => {
        if (!snapshots.length) return [];
        const now = new Date();
        let cutoff = subMonths(now, 3);

        if (timeFilter === "6m") cutoff = subMonths(now, 6);
        else if (timeFilter === "1y") cutoff = subMonths(now, 12);
        else if (timeFilter === "all") cutoff = new Date(0);

        return snapshots
            .filter(s => new Date(s.period) >= cutoff)
            .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime())
            .map((s, idx, arr) => {
                // If this is the latest snapshot, use real-time overall index if available
                const val = (idx === arr.length - 1 && realtimeOverallIndex !== null)
                    ? realtimeOverallIndex
                    : (Number(s.computed_index) || 75);

                return {
                    label: format(new Date(s.period), "MMM yy"),
                    value: val
                };
            });
    }, [snapshots, timeFilter, realtimeOverallIndex]);

    const spiderData = useMemo(() => {
        const latest = snapshots[0] || {};
        const avg = benchmark || {};

        const safeNum = (val: any, fallback = 75) => {
            const n = Number(val);
            return isNaN(n) ? fallback : n;
        };

        const currentAttendance = realtimeAttendance !== null ? realtimeAttendance : safeNum(latest.attendance_score, person.kpi.presenceScore);

        return [
            // User requested 77% as the new KKM for Attendance
            { label: "Attendance", value: currentAttendance, benchmark: safeNum(avg.avg_attendance_rate, 77) },
            { label: "Task Completion", value: safeNum(latest.task_completion_score, person.kpi.taskCompletionScore), benchmark: safeNum(avg.avg_task_completion_score, 75) },
            { label: "Project Involvement", value: safeNum(latest.project_involvement_score, person.kpi.projectInvolvement), benchmark: safeNum(avg.avg_project_involvement_score, 75) },
            { label: "Task Quality", value: safeNum(latest.quality_score, person.kpi.qualityScore), benchmark: safeNum(avg.avg_quality_score, 75) },
            { label: "Peer Review", value: safeNum(latest.peer_review_score, person.kpi.peerReviewScore), benchmark: safeNum(avg.avg_peer_review_score, 75) },
            { label: "Engagement", value: safeNum(latest.engagement_score, person.kpi.engagementScore), benchmark: safeNum(avg.avg_engagement_score, 75) }
        ];
    }, [snapshots, benchmark, person, realtimeAttendance]);

    const handleEditClick = () => {
        if (isMe) {
            setEditingOverride(true);
        } else {
            setShowConfirmation(true);
        }
    };

    const handleConfirmEdit = () => {
        setShowConfirmation(false);
        setEditingOverride(true);
    };

    const handleSave = () => {
        setEditingOverride(false);
    };

    if (isSystem) {
        return (
            <div className="p-8 text-center text-neutral-500 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                <Target className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <h3 className="font-medium text-neutral-900">Performance Disabled</h3>
                <p className="text-sm mt-1">System accounts are excluded from performance evaluation.</p>
            </div>
        );
    }

    if (person.include_in_performance === false) {
        return (
            <div className="p-8 text-center text-neutral-500 bg-amber-50 rounded-2xl border border-dashed border-amber-200">
                <AlertTriangle className="w-12 h-12 text-amber-300 mx-auto mb-3" />
                <h3 className="font-medium text-amber-900">Excluded from Performance</h3>
                <p className="text-sm mt-1 text-amber-700">This account is explicitly excluded from performance metrics (Role-based exclusion).</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* KPI OVERVIEW */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <ScoreCard
                    title="Overall Score"
                    value={realtimeOverallIndex !== null ? realtimeOverallIndex : person.kpi.overallScore}
                    icon={Award}
                    trend={person.performance.productivityTrend}
                    main
                />
                <ScoreCard
                    title="Attendance"
                    value={`${realtimeAttendance !== null ? realtimeAttendance : person.kpi.presenceScore}%`}
                    icon={Clock}
                />
                <ScoreCard
                    title="Task Completion"
                    value={snapshots[0]?.task_completion_score || person.kpi.taskCompletionScore}
                    icon={Target}
                />
                <ScoreCard
                    title="Project Inv."
                    value={snapshots[0]?.project_involvement_score ? `${snapshots[0].project_involvement_score}%` : `${person.kpi.projectInvolvement}%`}
                    icon={TrendingUp}
                />
                <ScoreCard
                    title="Task Quality"
                    value={snapshots[0]?.quality_score || person.kpi.qualityScore}
                    icon={Activity}
                />
            </div>


            {/* PERFORMANCE CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                {/* Line Chart: History */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-bold text-neutral-900">Performance Timeline</h3>
                            <p className="text-xs text-neutral-500">Overall performance history index</p>
                        </div>
                        <div className="flex bg-neutral-100 p-1 rounded-lg gap-1">
                            {rule?.period_type === 'weekly' ? (
                                <FilterButton active={timeFilter === '4w'} label="4 Weeks" onClick={() => setTimeFilter('4w')} />
                            ) : (
                                <>
                                    <FilterButton active={timeFilter === '3m'} label="3M" onClick={() => setTimeFilter('3m')} />
                                    <FilterButton active={timeFilter === '6m'} label="6M" onClick={() => setTimeFilter('6m')} />
                                    <FilterButton active={timeFilter === '1y'} label="1Y" onClick={() => setTimeFilter('1y')} />
                                    <FilterButton active={timeFilter === 'all'} label="ALL" onClick={() => setTimeFilter('all')} />
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 min-h-[250px] flex items-center justify-center">
                        {filteredHistory.length > 1 ? (
                            <PerformanceLineChart data={filteredHistory} height={250} />
                        ) : (
                            <div className="text-center">
                                <Activity className="w-10 h-10 text-neutral-200 mx-auto mb-2" />
                                <p className="text-sm text-neutral-400">Not enough history for charting.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Spider Chart: Current Period Breakdown */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                    <div>
                        <h3 className="font-bold text-neutral-900">Score Breakdown</h3>
                        <p className="text-xs text-neutral-500">Relative to team average (Benchmark)</p>
                    </div>

                    <div className="mt-8 flex items-center justify-center">
                        <SpiderChart data={spiderData} />
                    </div>
                </div>
            </div>
            {/* MANUAL OVERRIDE & MODALS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                <div className="md:col-span-2" /> {/* Layout Balance */}

                <div className={clsx("p-6 rounded-2xl border transition-all duration-300 h-fit", isEditingOverride ? "bg-white border-blue-200 ring-2 ring-blue-500/10" : "bg-neutral-50 border-neutral-200")}>
                    <div className="flex items-center justify-between mb-4 text-neutral-500">
                        <div className="flex items-center gap-2">
                            {isEditingOverride ? <Unlock className="w-4 h-4 text-blue-500" /> : <Lock className="w-4 h-4" />}
                            <h3 className={clsx("text-xs font-bold uppercase tracking-wide", isEditingOverride ? "text-blue-600" : "")}>Manual Override</h3>
                        </div>
                    </div>

                    <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
                        Performance scores are computed automatically based on system activity.
                        Overrides are restricted to HR and Superadmins.
                    </p>

                    {!isViewerAdmin ? (
                        <div
                            className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-between cursor-not-allowed text-neutral-400"
                        >
                            <span className="text-sm font-medium">Adjust Score</span>
                            <Lock className="w-3 h-3" />
                        </div>
                    ) : isEditingOverride ? (
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-neutral-500 mb-1 block">New Score</label>
                                <Input
                                    placeholder="0-100"
                                    value={manualScore}
                                    onChange={(e) => setManualScore(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="secondary" onClick={() => setEditingOverride(false)}>Cancel</Button>
                                <Button size="sm" variant="primary" className="bg-blue-600 border-blue-600 hover:bg-blue-700" onClick={handleSave}>Save</Button>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={handleEditClick}
                            className="p-3 bg-white rounded-lg border border-neutral-200 flex items-center justify-between cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all group"
                        >
                            <span className="text-sm font-medium group-hover:text-blue-600 transition-colors">Adjust Score</span>
                            <span className="text-xs text-neutral-400 group-hover:text-blue-400">Locked</span>
                        </div>
                    )}
                </div>
            </div>

            <EditConfirmationModal
                isOpen={showConfirmation}
                onClose={() => setShowConfirmation(false)}
                onConfirm={handleConfirmEdit}
            />
        </div>
    );
}

function ScoreCard({ title, value, icon: Icon, trend, main }: any) {
    return (
        <div className={clsx(
            "p-5 rounded-2xl border flex flex-col justify-between h-32 relative overflow-hidden",
            main ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-500/50" : "bg-white border-neutral-200"
        )}>
            {/* Background Icon */}
            <Icon className={clsx("absolute -right-4 -bottom-4 w-24 h-24 opacity-10", main ? "text-white" : "text-neutral-900")} />

            <div className={clsx("text-xs font-bold uppercase tracking-wider mb-2", main ? "text-blue-100" : "text-neutral-500")}>
                {title}
            </div>

            <div className="flex items-end gap-2 relative z-10">
                <div className="text-3xl font-bold tracking-tight">{value}</div>
                {trend && (
                    <div className={clsx("text-xs px-2 py-0.5 rounded-full font-medium mb-1",
                        trend === "rising" ? "bg-emerald-500/20 text-emerald-100" : "bg-white/20"
                    )}>
                        {trend === "rising" ? "▲" : trend === "falling" ? "▼" : "—"}
                    </div>
                )}
            </div>
        </div>
    );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                active ? "bg-white text-blue-600 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            )}
        >
            {label}
        </button>
    );
}
