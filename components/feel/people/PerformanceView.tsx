"use client";

import { Person } from "./types";
import { TrendingUp, Target, Activity, Users } from "lucide-react";
import clsx from "clsx";
import PeoplePageHeader from "./PeoplePageHeader";
import { useState } from "react";
import { EmptyState } from "@/shared/ui/overlays/EmptyState";

import { LiquidSummaryCard } from "@/components/shared/liquid/LiquidSummaryCard";

export default function PerformanceView({ people }: { people: Person[] }) {
    const [view, setView] = useState<"list" | "card">("list"); // Simplifying for this view
    const [searchQuery, setSearchQuery] = useState("");

    const filteredPeople = people.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* HEADER */}
            <div>
                <h2 className="text-2xl font-bold text-neutral-900">Performance Index</h2>
                <p className="text-sm text-neutral-500 mt-1">Key Performance Indicators, Project Involvement, and Engagement Scores.</p>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <LiquidSummaryCard
                    label="Avg Involvement"
                    value="85%"
                    icon={<Target className="w-5 h-5 text-blue-600" />}
                    iconBg="bg-blue-100"
                />
                <LiquidSummaryCard
                    label="Platform Engagement"
                    value="92%"
                    icon={<Activity className="w-5 h-5 text-purple-600" />}
                    iconBg="bg-purple-100"
                />
                <LiquidSummaryCard
                    label="Top Performers"
                    value={3}
                    icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
                    iconBg="bg-emerald-100"
                    className="ring-2 ring-emerald-500 border-transparent bg-emerald-50/30"
                />
                <LiquidSummaryCard
                    label="Need Support"
                    value={1}
                    icon={<Users className="w-5 h-5 text-orange-600" />}
                    iconBg="bg-orange-100"
                />
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Name / Role</th>
                            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Project Inv.</th>
                            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Presence</th>
                            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Engagement</th>
                            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Overall Score</th>
                            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">Status</th>
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
                                <td className="px-6 py-4 text-right">
                                    <ScoreBar value={person.kpi.projectInvolvement} color="blue" />
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-medium text-neutral-700">{person.kpi.presenceScore}%</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-medium text-neutral-700">{person.kpi.engagementScore}%</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-bold text-neutral-900 text-lg">{person.kpi.overallScore}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={clsx(
                                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                        person.kpi.overallScore >= 90 ? "bg-emerald-50 text-emerald-700" :
                                            person.kpi.overallScore >= 80 ? "bg-blue-50 text-blue-700" :
                                                "bg-orange-50 text-orange-700"
                                    )}>
                                        {person.kpi.overallScore >= 90 ? "Excellent" : person.kpi.overallScore >= 80 ? "Good" : "Fair"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}



function ScoreBar({ value, color }: { value: number; color: "blue" | "green" | "orange" }) {
    return (
        <div className="flex items-center justify-end gap-2">
            <div className="text-xs font-semibold w-8 text-right">{value}%</div>
            <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                    style={{ width: `${value}%` }}
                    className={clsx(
                        "h-full rounded-full",
                        color === "blue" ? "bg-blue-500" :
                            color === "green" ? "bg-emerald-500" : "bg-orange-500"
                    )}
                />
            </div>
        </div>
    )
}
