"use client";

import { useState, useEffect } from "react";
import { Person } from "./types";
import { Clock, CheckCircle, TrendingUp, TrendingDown, Minus, Briefcase, Calendar, AlertCircle, Star, Settings } from "lucide-react";
import clsx from "clsx";
import { Button } from "@/shared/ui/primitives/button/button";
import SkillsManagerModal from "./modals/SkillsManagerModal";
import StatusUpdateModal from "./modals/StatusUpdateModal";
import { PeopleSkill, PeopleAvailability } from "@/lib/types/people-types";
import { fetchPeopleSkills, fetchPeopleAvailability } from "@/lib/api/people";

export default function PersonalDashboard({ person }: { person: Person }) {
    // -- NEW STATE --
    const [skills, setSkills] = useState<PeopleSkill[]>([]);
    const [availability, setAvailability] = useState<PeopleAvailability | null>(null);
    const [isSkillsModalOpen, setSkillsModalOpen] = useState(false);
    const [isStatusModalOpen, setStatusModalOpen] = useState(false);

    // Initial Load
    useEffect(() => {
        if (person.id) {
            refreshData();
        }
    }, [person.id]);

    const refreshData = () => {
        fetchPeopleSkills(person.id).then(setSkills);
        fetchPeopleAvailability(person.id).then(setAvailability);
    };

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

    // Status Helper
    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'available': return "text-emerald-600 bg-emerald-50 border-emerald-100";
            case 'normal': return "text-blue-600 bg-blue-50 border-blue-100";
            case 'overloaded': return "text-red-600 bg-red-50 border-red-100";
            default: return "text-neutral-600 bg-neutral-50 border-neutral-100";
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* SECTION A: IDENTITY & AVAILABILITY */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-brand-red/10 flex items-center justify-center text-2xl font-bold text-brand-red shrink-0">
                    {person.initials}
                </div>
                <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-neutral-900">{person.name}</h2>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 uppercase tracking-wide">
                            {person.role}
                        </span>
                    </div>
                    <p className="text-neutral-500 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-sm justify-center md:justify-start">
                        <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {person.title}</span>
                        <span className="hidden md:inline text-neutral-300">•</span>
                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Joined {person.joinedAt}</span>
                    </p>
                </div>

                {/* AVAILABILITY CARD */}
                <div
                    onClick={() => setStatusModalOpen(true)}
                    className={clsx(
                        "w-full md:w-auto min-w-[200px] cursor-pointer rounded-xl border p-4 transition-all hover:brightness-95",
                        getStatusColor(availability?.workload_status || 'normal')
                    )}
                >
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">Current Workload</div>
                    <div className="flex items-center justify-between">
                        <div className="text-lg font-bold capitalize">
                            {availability?.workload_status || 'Normal'}
                        </div>
                        <Settings className="w-4 h-4 opacity-50" />
                    </div>
                    {availability?.notes && (
                        <div className="mt-2 text-xs opacity-80 border-t border-black/5 pt-2 truncate max-w-[200px]">
                            {availability.notes}
                        </div>
                    )}
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
                        <span className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-50 px-2 py-1 rounded">Read Only</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <StatCard label="Attendance Rate" value={`${person.attendance.attendanceRate}%`} sub="Consistency" />
                        <StatCard label="Total Days" value={person.attendance.totalDays} sub="Working Days" />
                        <StatCard label="Late Arrivals" value={person.attendance.lateDays} sub="Days" warn={person.attendance.lateDays > 5} />
                        <StatCard label="Overtime" value={`${person.attendance.overtimeHours}h`} sub="Hours Logged" />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-sm flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>Attendance data is automatically synced from the FEEL - CLOCK module.</p>
                    </div>
                </div>

                {/* SECTION C: PERFORMANCE */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            Performance Metrics
                        </h3>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-50 px-2 py-1 rounded">Synced</span>
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
                    {/* INSIGHT */}
                    <div className="bg-neutral-50 p-4 rounded-xl text-neutral-700 text-sm">
                        <h4 className="font-bold text-neutral-900 mb-1 flex items-center gap-2">
                            <SparklesIcon /> Analysis
                        </h4>
                        <p>{getInsight()}</p>
                    </div>
                </div>
            </div>

            {/* SECTION D: SKILLS & GROWTH (NEW) */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                        <Star className="w-5 h-5 text-purple-500" />
                        Skills & Competency
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => setSkillsModalOpen(true)}>
                        Manage Skills
                    </Button>
                </div>

                {skills.length === 0 ? (
                    <div className="text-center py-8 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                        <p className="text-neutral-400 text-sm mb-2">No skills added to your profile yet.</p>
                        <Button variant="text" onClick={() => setSkillsModalOpen(true)}>Add your first skill</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {skills.map((skill) => (
                            <div key={skill.id} className="p-3 border border-neutral-100 rounded-xl bg-neutral-50/50 flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase text-neutral-400">{skill.skill_level}</span>
                                    {skill.skill_level === 'expert' && <Star className="w-3 h-3 text-purple-500 fill-purple-500" />}
                                </div>
                                <div className="font-semibold text-neutral-900">{skill.skill_name}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODALS */}
            <SkillsManagerModal
                isOpen={isSkillsModalOpen}
                onClose={() => setSkillsModalOpen(false)}
                userId={person.id}
                onUpdate={refreshData}
            />

            <StatusUpdateModal
                isOpen={isStatusModalOpen}
                onClose={() => setStatusModalOpen(false)}
                userId={person.id}
                currentStatus={availability} // Pass the full availability object
                onUpdate={refreshData}
            />

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
