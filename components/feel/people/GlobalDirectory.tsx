"use client";

import { useState } from "react";
import { Person } from "./types";
import { Users, AlertTriangle, TrendingUp, Clock, MoreVertical } from "lucide-react";
import clsx from "clsx";
import PeoplePageHeader, { PeopleView } from "./PeoplePageHeader";
import { EmptyState } from "@/shared/ui/overlays/EmptyState";

export default function GlobalDirectory({ people, role }: { people: Person[], role: string }) {
    const [view, setView] = useState<PeopleView>("list");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredPeople = people.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8">

            {/* SECTION A: PEOPLE OVERVIEW */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <OverviewCard title="Total Staff" value={people.length} icon={<Users className="w-5 h-5 text-blue-500" />} />
                <OverviewCard title="Active Projects" value={14} icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} />
                <OverviewCard title="Avg Attendance" value="92%" icon={<Clock className="w-5 h-5 text-purple-500" />} />
                <OverviewCard title="Requires Review" value={2} icon={<AlertTriangle className="w-5 h-5 text-orange-500" />} highlight />
            </div>

            <PeoplePageHeader
                view={view}
                onChangeView={setView}
                onAddPerson={() => { }}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            {/* SECTION B: MATRIX VIEW (for List) */}
            {view === "list" ? (
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-50 border-b border-neutral-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Name / Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Attendance %</th>
                                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Overtime</th>
                                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Perf. Score</th>
                                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">Trend</th>
                                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filteredPeople.map((person) => (
                                <tr key={person.id} className="hover:bg-neutral-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-600">
                                                {person.initials}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-neutral-900 text-sm">{person.name}</div>
                                                <div className="text-xs text-neutral-500">{person.title}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            person.status === "Active" ? "bg-green-50 text-green-700" :
                                                person.status === "Probation" ? "bg-orange-50 text-orange-700" :
                                                    "bg-neutral-100 text-neutral-500"
                                        )}>
                                            {person.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className={clsx("font-medium", person.attendance.attendanceRate < 90 ? "text-red-500" : "text-neutral-900")}>
                                            {person.attendance.attendanceRate}%
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-neutral-600">
                                        {person.attendance.overtimeHours}h
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-bold text-neutral-900">{person.performance.performanceScore}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center">
                                            {person.performance.productivityTrend === "rising" && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                                            {person.performance.productivityTrend === "falling" && <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />}
                                            {person.performance.productivityTrend === "stable" && <div className="w-4 h-1 bg-neutral-300 rounded-full my-1.5" />}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-neutral-200 rounded-lg text-neutral-400 hover:text-neutral-900">
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState
                    icon={Users}
                    title="View Not Implemented"
                    description="Alternate views (Card, Board) coming soon."
                />
            )}
        </div>
    );
}

function OverviewCard({ title, value, icon, highlight }: { title: string; value: string | number; icon: React.ReactNode; highlight?: boolean }) {
    return (
        <div className={clsx(
            "p-5 rounded-2xl border flex items-center justify-between",
            highlight ? "bg-orange-50 border-orange-100" : "bg-white border-neutral-200"
        )}>
            <div>
                <div className="text-sm text-neutral-500 font-medium mb-1">{title}</div>
                <div className={clsx("text-2xl font-bold", highlight ? "text-orange-900" : "text-neutral-900")}>{value}</div>
            </div>
            <div className={clsx("p-3 rounded-xl", highlight ? "bg-orange-100" : "bg-neutral-50")}>
                {icon}
            </div>
        </div>
    );
}
