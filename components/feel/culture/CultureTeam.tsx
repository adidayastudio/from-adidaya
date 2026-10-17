"use client";

import { useState } from "react";
import clsx from "clsx";
import { Button } from "@/shared/ui/primitives/button/button";
import { Search, Filter, MoreHorizontal, ChevronRight, BarChart3, Users, Clock, User } from "lucide-react";

interface CultureTeamProps {
    onNavigate: (section: string) => void;
    viewMode: "PERSONAL" | "TEAM";
    onToggleView: (mode: "PERSONAL" | "TEAM") => void;
    userRole: string;
}

const MOCK_TEAM_STATS = [
    { label: "Avg Tenure", value: "1.2 Years", trend: "+0.1", trendUp: true, icon: Clock },
    { label: "Chapter Completion", value: "87%", trend: "+2%", trendUp: true, icon: BarChart3 },
    { label: "Active Members", value: "24", trend: "0", trendUp: true, icon: Users },
];

const MOCK_MEMBERS = [
    { id: 1, name: "Budi Santoso", role: "Mandor", tenure: "2.1 Years", currentChapter: "Leadership Mindset", progress: 45, status: "ON_TRACK" },
    { id: 2, name: "Siti Aminah", role: "Admin", tenure: "8 Months", currentChapter: "Ownership", progress: 80, status: "ON_TRACK" },
    { id: 3, name: "Joko Anwar", role: "Tukang", tenure: "3 Months", currentChapter: "Adaptation", progress: 10, status: "BEHIND" },
    { id: 4, name: "Rina Wati", role: "Finance", tenure: "1.5 Years", currentChapter: "Contribution", progress: 95, status: "ON_TRACK" },
];

export function CultureTeam({ onNavigate, viewMode, onToggleView, userRole }: CultureTeamProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const isHr = userRole === "hr";

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* HEADER (Matching ClockOverview) */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">Culture</h1>
                        <p className="text-sm text-neutral-500 mt-1">Manage team culture, chapters, and health.</p>
                    </div>

                    {/* VIEW MODE TOGGLE (HR Only) */}
                    {isHr && (
                        <div className="flex items-center bg-neutral-100 rounded-full p-1 self-start md:self-auto">
                            <button
                                onClick={() => onToggleView("PERSONAL")}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                                    viewMode === "PERSONAL" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                                )}
                            >
                                <User className="w-4 h-4" /> Personal
                            </button>
                            <button
                                onClick={() => onToggleView("TEAM")}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                                    viewMode === "TEAM" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                                )}
                            >
                                <Users className="w-4 h-4" /> Team
                            </button>
                        </div>
                    )}
                </div>
                <div className="border-b border-neutral-200" />
            </div>

            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MOCK_TEAM_STATS.map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex items-start justify-between">
                        <div>
                            <p className="text-sm text-neutral-500 font-medium mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-neutral-900">{stat.value}</h3>
                            <div className={clsx("flex items-center text-xs mt-2 font-medium", stat.trendUp ? "text-emerald-600" : "text-red-600")}>
                                {stat.trendUp ? "+" : ""}{stat.trend} vs last month
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400">
                            <stat.icon className="w-5 h-5" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-neutral-900">Team Progress</h2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Search member..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all w-full sm:w-64"
                            />
                        </div>
                        <Button variant="secondary" icon={<Filter className="w-4 h-4" />}>Filter</Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 border-b border-neutral-100">
                            <tr>
                                <th className="px-6 py-3 text-left font-semibold text-neutral-600">Member</th>
                                <th className="px-6 py-3 text-left font-semibold text-neutral-600">Tenure</th>
                                <th className="px-6 py-3 text-left font-semibold text-neutral-600">Current Chapter</th>
                                <th className="px-6 py-3 text-left font-semibold text-neutral-600">Progress</th>
                                <th className="px-6 py-3 text-right font-semibold text-neutral-600">Status</th>
                                <th className="px-6 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {MOCK_MEMBERS.map((member) => (
                                <tr key={member.id} className="hover:bg-neutral-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold text-xs">
                                                {member.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-neutral-900">{member.name}</div>
                                                <div className="text-xs text-neutral-500">{member.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-neutral-600">{member.tenure}</td>
                                    <td className="px-6 py-4 text-neutral-900 font-medium">{member.currentChapter}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden min-w-[80px]">
                                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${member.progress}%` }} />
                                            </div>
                                            <span className="text-xs text-neutral-500 w-8">{member.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-full text-xs font-bold",
                                            member.status === "ON_TRACK" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                        )}>
                                            {member.status === "ON_TRACK" ? "On Track" : "Behind"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition-colors">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-neutral-100 bg-neutral-50 text-center">
                    <Button variant="secondary" className="!bg-transparent !border-none !text-neutral-500 hover:!text-neutral-900">
                        View All Members
                    </Button>
                </div>
            </div>
        </div>
    );
}
