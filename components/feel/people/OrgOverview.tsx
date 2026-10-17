import { LiquidSummaryCard } from "@/components/shared/liquid/LiquidSummaryCard";

// ... [existing imports]
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <LiquidSummaryCard
                    label="Total Headcount"
                    value={stats.total}
                    subtext={`${stats.active} Active / ${stats.onLeave} Away`}
                    icon={<Users className="w-5 h-5 text-blue-600" />}
                    iconBg="bg-blue-100"
                    onClick={() => onNavigate('directory', 'all')}
                />
                <LiquidSummaryCard
                    label="Avg Attendance"
                    value={`${stats.avgAttendance.toFixed(1)}%`}
                    subtext="Last 30 Days"
                    icon={<Clock className="w-5 h-5 text-emerald-600" />}
                    iconBg="bg-emerald-100"
                    onClick={() => onNavigate('directory', 'attendance_issue')}
                />
                <LiquidSummaryCard
                    label="Performance Index"
                    value={stats.avgPerformance.toFixed(1)}
                    subtext="Org Wide"
                    icon={<Zap className="w-5 h-5 text-purple-600" />}
                    iconBg="bg-purple-100"
                    onClick={() => onNavigate('directory', 'high_performers')}
                />
                <LiquidSummaryCard
                    label="High Workload"
                    value={stats.overloaded}
                    subtext="Burnout Risks"
                    icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
                    iconBg="bg-red-100"
                    valueColor={stats.overloaded > 0 ? "text-red-500" : "text-neutral-900"}
                    onClick={() => onNavigate('directory', 'overloaded')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* DEPT DISTRIBUTION */}
                <div className="lg:col-span-2 bg-white p-6 rounded-[24px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
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
                                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden flex items-center">
                                    <div
                                        className="h-full bg-blue-600/80 group-hover:bg-blue-600 transition-colors duration-300 rounded-full"
                                        style={{ width: `${(count / stats.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ROLE DISTRIBUTION & SIGNALS */}
                <div className="space-y-4">
                    <div className="bg-white p-6 rounded-[24px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                        <h3 className="font-bold text-neutral-900 flex items-center gap-2 mb-4">
                            <Briefcase className="w-5 h-5 text-neutral-400" />
                            Role Composition
                        </h3>
                        <div className="space-y-2">
                            {Object.entries(stats.roles).map(([role, count]) => (
                                <div key={role} className="flex items-center justify-between p-3 bg-neutral-50/50 rounded-xl border border-neutral-100">
                                    <div className="capitalize text-[13px] font-bold text-neutral-700">{role}</div>
                                    <div className="text-[12px] font-numeric font-bold px-2 py-0.5 bg-white rounded border border-neutral-200">{count}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 p-6 rounded-[24px] border border-blue-100/50">
                        <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-2 tracking-tight">
                            <TrendingUp className="w-5 h-5" />
                            Insights
                        </h3>
                        <p className="text-[13px] text-blue-800/80 font-medium mb-4 leading-relaxed">
                            Construction department has maintained 98% attendance for 3 consecutive months.
                        </p>
                        <Button variant="outline" size="sm" className="w-full bg-white/60 border-blue-200/50 text-blue-800 hover:bg-white transition-colors rounded-xl shadow-sm">
                            View Analytics
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
