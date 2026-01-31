"use client";

import { useMemo } from "react";
import { Person } from "./types";
import { Users, Clock, Zap, AlertTriangle, TrendingUp, Building2, Briefcase } from "lucide-react";
import clsx from "clsx";
import { Button } from "@/shared/ui/primitives/button/button";

interface OrgOverviewProps {
    people: Person[];
    onNavigate: (section: "directory", filter?: string) => void;
}

export default function OrgOverview({ people, onNavigate }: OrgOverviewProps) {

    // -- CALCULATE AGGREGATES --
    const stats = useMemo(() => {
        const total = people.length;
        const active = people.filter(p => p.status === 'Active').length;
        const onLeave = people.filter(p => p.status === 'On Leave').length;

        const avgAttendance = people.reduce((acc, p) => acc + p.attendance.attendanceRate, 0) / (total || 1);
        const avgPerformance = people.reduce((acc, p) => acc + p.performance.performanceScore, 0) / (total || 1);

        // Mocking "Overloaded" status based on overtime for now if actual status not available
        // In real data, we would use p.availability.workload_status if merged
        const overloaded = people.filter(p => p.attendance.overtimeHours > 20).length;

        // Group by Department
        const depts: Record<string, number> = {};
        const roles: Record<string, number> = {};

        people.forEach(p => {
            depts[p.department] = (depts[p.department] || 0) + 1;
            roles[p.role] = (roles[p.role] || 0) + 1;
        });

        return { total, active, onLeave, avgAttendance, avgPerformance, overloaded, depts, roles };
    }, [people]);

    return (
        <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">

            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-neutral-900">Organization Snapshot</h2>
                <p className="text-neutral-500 text-sm">Real-time metrics and workforce health indicators.</p>
            </div>

            {/* TOP METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    label="Total Headcount"
                    value={stats.total}
                    sub={`${stats.active} Active / ${stats.onLeave} Away`}
                    icon={Users}
                    onClick={() => onNavigate('directory', 'all')}
                />
                <SummaryCard
                    label="Avg Attendance"
                    value={`${stats.avgAttendance.toFixed(1)}%`}
                    sub="Last 30 Days"
                    icon={Clock}
                    trend="stable"
                    onClick={() => onNavigate('directory', 'attendance_issue')}
                />
                <SummaryCard
                    label="Performance Index"
                    value={stats.avgPerformance.toFixed(1)}
                    sub="Organization Wide"
                    icon={Zap}
                    highlight
                    onClick={() => onNavigate('directory', 'high_performers')}
                />
                <SummaryCard
                    label="High Workload"
                    value={stats.overloaded}
                    sub="Potential Burnout Risks"
                    icon={AlertTriangle}
                    alert={stats.overloaded > 0}
                    onClick={() => onNavigate('directory', 'overloaded')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* DEPT DISTRIBUTION */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-neutral-400" />
                            Department Breakdown
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {Object.entries(stats.depts).map(([dept, count]) => (
                            <div key={dept} className="group cursor-pointer" onClick={() => onNavigate('directory', dept)}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-neutral-700 group-hover:text-blue-600 transition-colors">{dept}</span>
                                    <span className="text-neutral-400">{count} staff</span>
                                </div>
                                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-neutral-800 group-hover:bg-blue-600 transition-colors duration-300"
                                        style={{ width: `${(count / stats.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ROLE DISTRIBUTION & SIGNALS */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                        <h3 className="font-bold text-neutral-900 flex items-center gap-2 mb-4">
                            <Briefcase className="w-5 h-5 text-neutral-400" />
                            Role Composition
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(stats.roles).map(([role, count]) => (
                                <div key={role} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                                    <div className="capitalize text-sm font-medium text-neutral-700">{role}</div>
                                    <div className="text-xs font-bold px-2 py-1 bg-white rounded border border-neutral-200">{count}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5" />
                            Insights
                        </h3>
                        <p className="text-sm text-blue-700 mb-4">
                            Construction department has maintained 98% attendance for 3 consecutive months.
                        </p>
                        <Button variant="outline" size="sm" className="w-full bg-white border-blue-200 text-blue-700 hover:bg-blue-50">
                            View Analytics
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ label, value, sub, icon: Icon, trend, alert, highlight, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className={clsx(
                "p-5 rounded-2xl border flex flex-col justify-between h-32 cursor-pointer transition-all hover:shadow-md active:scale-95",
                highlight ? "bg-neutral-900 text-white border-neutral-800" : "bg-white border-neutral-200 shadow-sm hover:border-blue-200"
            )}
        >
            <div className="flex justify-between items-start">
                <div className={clsx("text-xs font-bold uppercase tracking-wider", highlight ? "text-neutral-400" : "text-neutral-400")}>
                    {label}
                </div>
                <Icon className={clsx("w-5 h-5", highlight ? "text-neutral-500" : "text-neutral-300")} />
            </div>

            <div>
                <div className={clsx("text-3xl font-bold tracking-tight mb-1",
                    highlight ? "text-white" : alert ? "text-red-500" : "text-neutral-900"
                )}>
                    {value}
                </div>
                <div className={clsx("text-[10px] font-medium flex items-center gap-1.5", highlight ? "text-neutral-400" : "text-neutral-500")}>
                    {alert && <AlertTriangle className="w-3 h-3 text-red-500" />}
                    {sub}
                </div>
            </div>
        </div>
    );
}
