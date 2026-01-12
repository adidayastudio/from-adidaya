"use client";

import { Person } from "./types";
import { Clock, CheckCircle, TrendingUp, TrendingDown, Minus, Briefcase, Calendar, AlertCircle } from "lucide-react";
import clsx from "clsx";

export default function PersonalDashboard({ person }: { person: Person }) {

    // Calculate insight based on data (Simple logic as requested)
    const getInsight = () => {
        if (person.attendance.attendanceRate > 95 && person.performance.tasksCompleted > 100) {
            return "Strong Link: High attendance consistency is driving excellent task completion.";
        }
        if (person.attendance.lateDays > 10 && person.performance.productivityTrend === "falling") {
            return "Attention: Frequent lateness correlates with a recent dip in productivity.";
        }
        if (person.attendance.overtimeHours > 40 && person.performance.productivityTrend === "stable") {
            return "Note: High overtime hours are maintaining output, but check for burnout risk.";
        }
        return "Status: Performance and attendance metrics are within normal ranges.";
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="bg-red-500 text-white p-2 text-center font-bold">DEBUG: PERSONAL DASHBOARD MOUNTED</div>

            {/* SECTION A: IDENTITY */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-brand-red/10 flex items-center justify-center text-2xl font-bold text-brand-red">
                    {person.initials}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-neutral-900">{person.name}</h2>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 uppercase tracking-wide">
                            {person.role}
                        </span>
                    </div>
                    <p className="text-neutral-500 mt-1 flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {person.title}</span>
                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Joined {person.joinedAt}</span>
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-neutral-400 mb-1">Current Status</div>
                    <div className={clsx(
                        "text-lg font-bold",
                        person.status === "Active" ? "text-green-600" : "text-neutral-600"
                    )}>
                        {person.status}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* SECTION B: ATTENDANCE (READ ONLY) */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-500" />
                            Attendance Summary
                        </h3>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-50 px-2 py-1 rounded">Read Only from Clock</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <StatCard label="Attendance Rate" value={`${person.attendance.attendanceRate}%`} sub="Consistency" />
                        <StatCard label="Total Days" value={person.attendance.totalDays} sub="Working Days" />
                        <StatCard label="Late Arrivals" value={person.attendance.lateDays} sub="Days" warn={person.attendance.lateDays > 5} />
                        <StatCard label="Overtime" value={`${person.attendance.overtimeHours}h`} sub="Hours Logged" />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>Attendance data is automatically synced from the FEEL - CLOCK module. Please contact HR for any discrepancies.</p>
                    </div>
                </div>

                {/* SECTION C: PERFORMANCE */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            Performance Metrics
                        </h3>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-50 px-2 py-1 rounded">Synced from Flow</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <StatCard label="Tasks Completed" value={person.performance.tasksCompleted} sub="All Time" />
                        <StatCard label="Perf. Score" value={person.performance.performanceScore} sub="Out of 100" highlight />
                        <StatCard label="Active Projects" value={person.performance.activeProjects} sub="Current" />
                        <StatCard
                            label="Trend"
                            value={person.performance.productivityTrend.toUpperCase()}
                            sub="Last 30 Days"
                            icon={
                                person.performance.productivityTrend === "rising" ? <TrendingUp className="w-4 h-4 text-emerald-500" /> :
                                    person.performance.productivityTrend === "falling" ? <TrendingDown className="w-4 h-4 text-red-500" /> :
                                        <Minus className="w-4 h-4 text-neutral-400" />
                            }
                        />
                    </div>

                    {/* SECTION D: CORRELATION INSIGHT */}
                    <div className="bg-neutral-50 p-4 rounded-xl text-neutral-700 text-sm">
                        <h4 className="font-bold text-neutral-900 mb-1 flex items-center gap-2">
                            <SparklesIcon /> Analysis
                        </h4>
                        <p>{getInsight()}</p>
                    </div>
                </div>
            </div>

            {/* SECTION E: PERSONAL GROWTH */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                <h3 className="text-lg font-bold text-neutral-900 mb-4">Focus & Growth</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border border-neutral-100 rounded-xl">
                        <div className="text-xs font-bold text-neutral-400 uppercase mb-2">Next Skill Goal</div>
                        <div className="font-semibold">Advanced Project Management</div>
                    </div>
                    <div className="p-4 border border-neutral-100 rounded-xl">
                        <div className="text-xs font-bold text-neutral-400 uppercase mb-2">Training Status</div>
                        <div className="font-semibold text-emerald-600">Up to Date</div>
                    </div>
                    <div className="p-4 border border-neutral-100 rounded-xl">
                        <div className="text-xs font-bold text-neutral-400 uppercase mb-2">Next Review</div>
                        <div className="font-semibold">June 2026</div>
                    </div>
                </div>
            </div>

        </div>
    );
}

function StatCard({ label, value, sub, highlight, warn, icon }: { label: string; value: string | number; sub: string; highlight?: boolean; warn?: boolean; icon?: React.ReactNode }) {
    return (
        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
            <div className="text-xs text-neutral-500 mb-1">{label}</div>
            <div className="flex items-center gap-2">
                <div className={clsx(
                    "text-2xl font-bold tracking-tight",
                    highlight ? "text-emerald-600" : warn ? "text-red-600" : "text-neutral-900"
                )}>
                    {value}
                </div>
                {icon}
            </div>
            <div className="text-[10px] text-neutral-400 font-medium uppercase tracking-wide mt-1">{sub}</div>
        </div>
    );
}

function SparklesIcon() {
    return (
        <svg className="w-4 h-4 text-brand-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
    );
}
