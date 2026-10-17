"use client";

import { useState, useEffect } from "react";
import { Person } from "./types";
import { CheckCircle, Clock, Calendar, TrendingUp, AlertCircle, MessageSquare } from "lucide-react";
import clsx from "clsx";
import { fetchPeopleFeedback, fetchPeoplePerformance } from "@/lib/api/people";
import { PeopleFeedback, PeoplePerformanceSnapshot } from "@/lib/types/people-types";
import { format } from "date-fns";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

export default function PersonalPerformance({ person }: { person: Person }) {
    const [feedback, setFeedback] = useState<PeopleFeedback[]>([]);
    const [snapshots, setSnapshots] = useState<PeoplePerformanceSnapshot[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (person.id) {
            loadPerfData();
        }
    }, [person.id]);

    const loadPerfData = async () => {
        setLoading(true);
        const [fb, snaps] = await Promise.all([
            fetchPeopleFeedback(person.id),
            fetchPeoplePerformance(person.id)
        ]);
        setFeedback(fb);
        setSnapshots(snaps);
        setLoading(false);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">

            {/* H1 header */}
            <div>
                <h2 className="text-2xl font-bold text-neutral-900">Performance Overview</h2>
                <p className="text-neutral-500 text-sm">Track your contributions, attendance constancy, and team feedback.</p>
            </div>

            {/* SECTION: SNAPSHOTS (Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <PerfCard
                    label="Attendance Score"
                    value={`${person.attendance.attendanceRate}%`}
                    sub="Past 30 Days"
                    icon={Clock}
                    trend="steady"
                />
                <PerfCard
                    label="Tasks Completed"
                    value={person.performance.tasksCompleted}
                    sub="All Time"
                    icon={CheckCircle}
                    trend="up"
                />
                <PerfCard
                    label="Overtime Ratio"
                    value={`${(person.attendance.overtimeHours / 160 * 100).toFixed(1)}%`}
                    sub="vs Standard Hours"
                    icon={TrendingUp}
                    alert={person.attendance.overtimeHours > 20}
                />
                <PerfCard
                    label="Overall Score"
                    value={person.performance.performanceScore}
                    sub="Aggregate KPI"
                    icon={CheckCircle}
                    highlight
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* TIMELINE / HISTORY */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                        <h3 className="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-neutral-400" />
                            Performance Timeline
                        </h3>

                        {/* Placeholder for Chart - using CSS bars for now */}
                        <div className="h-64 flex items-end gap-3 justify-between px-4 pb-2 border-b border-neutral-100">
                            {/* Mock Bars just for visual structure if no snapshots */}
                            {[65, 78, 85, 92, 88, 96].map((val, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div
                                        className="w-full bg-blue-100 rounded-t-lg relative group-hover:bg-blue-200 transition-all"
                                        style={{ height: `${val}%` }}
                                    >
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {val}
                                        </div>
                                    </div>
                                    <div className="text-xs text-neutral-400 font-medium">M{i + 1}</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-neutral-400 px-2">
                            <span>6 Months Ago</span>
                            <span>Current</span>
                        </div>
                    </div>

                    {/* GROWTH / GOALS (Placeholder) */}
                    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                        <h3 className="text-lg font-bold text-neutral-900 mb-4">Personal Growth</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-semibold text-neutral-900">Advanced Revit Certification</span>
                                    <span className="text-xs font-bold text-blue-600">In Progress</span>
                                </div>
                                <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[65%]" />
                                </div>
                                <div className="mt-2 text-xs text-neutral-500">Expected completion: March 2026</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COL: FEEDBACK */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm min-h-[500px]">
                        <h3 className="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-neutral-400" />
                            Feedback & Notes
                        </h3>

                        {loading ? (
                            <GlobalLoading />
                        ) : feedback.length === 0 ? (
                            <div className="text-center py-12 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                                <p className="text-neutral-400 text-sm">No feedback notes yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 relative">
                                {/* Vertical Line */}
                                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-neutral-100" />

                                {feedback.map((item) => (
                                    <div key={item.id} className="relative pl-8">
                                        <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 border-blue-100 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        </div>
                                        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-sm">
                                            <p className="text-neutral-700 leading-relaxed mb-3">"{item.note}"</p>
                                            <div className="flex items-center justify-between text-xs text-neutral-400">
                                                <span className="font-medium text-neutral-500">From Manager</span>
                                                <span>{format(new Date(item.created_at), 'd MMM yyyy')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function PerfCard({ label, value, sub, icon: Icon, trend, alert, highlight }: any) {
    return (
        <div className={clsx(
            "p-5 rounded-2xl border flex flex-col justify-between h-32",
            highlight ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200" : "bg-white border-neutral-200 shadow-sm"
        )}>
            <div className="flex justify-between items-start">
                <div className={clsx("text-xs font-bold uppercase tracking-wider", highlight ? "text-emerald-100" : "text-neutral-400")}>
                    {label}
                </div>
                <Icon className={clsx("w-5 h-5", highlight ? "text-emerald-200" : "text-neutral-300")} />
            </div>

            <div>
                <div className={clsx("text-3xl font-bold tracking-tight mb-1",
                    highlight ? "text-white" : alert ? "text-red-500" : "text-neutral-900"
                )}>
                    {value}
                </div>
                <div className={clsx("text-[10px] font-medium flex items-center gap-1.5", highlight ? "text-emerald-100" : "text-neutral-500")}>
                    {alert && <AlertCircle className="w-3 h-3 text-red-500" />}
                    {sub}
                </div>
            </div>
        </div>
    );
}
