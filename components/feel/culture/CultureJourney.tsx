"use client";

import { useState } from "react";
import clsx from "clsx";
import {
    CheckCircle,
    Lock,
    Clock,
    TrendingUp,
    Users,
    User,
    Award,
    ChevronRight,
    BarChart3,
    MessageSquareQuote,
    Sparkles
} from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";

interface CultureJourneyProps {
    onNavigate: (section: string) => void;
    viewMode?: "PERSONAL" | "TEAM";
    onToggleView?: (mode: "PERSONAL" | "TEAM") => void;
    userRole?: string;
}

// --- MOCK DATA ---
const PERSONAL_DATA = {
    tenure: "8 months",
    completedChapters: 2,
    totalChapters: 5,
    narrative: "Selama 8 bulan terakhir, kamu menunjukkan peningkatan konsistensi dan rasa ownership. Perjalananmu baru saja dimulai, teruslah belajar.",
    timeline: [
        {
            id: 0,
            title: "Chapter 0: Welcome",
            date: "Jan 15, 2024",
            status: "COMPLETED",
            outcome: "Ready to Start",
            insight: "Antusiasme tinggi di minggu pertama.",
            pmFeedback: null
        },
        {
            id: 1,
            title: "Chapter 1: Adaptation",
            date: "Feb 10, 2024",
            status: "COMPLETED",
            outcome: "Highly Adaptable",
            insight: "Cepat berbaur dengan budaya tim.",
            pmFeedback: "Great job adapting to the team rhythm, Ardi. Keep it up!"
        },
        {
            id: 2,
            title: "Chapter 2: Contribution",
            date: "Apr 05, 2024",
            status: "COMPLETED",
            outcome: "Proactive Contributor",
            insight: "Sering memberikan ide di meeting.",
            pmFeedback: "I appreciate your input in the last sprint retrospective."
        },
        {
            id: 3,
            title: "Chapter 3: Ownership",
            date: null,
            status: "IN_PROGRESS",
            outcome: "Pending",
            insight: "Sedang mendalami tanggung jawab penuh.",
            pmFeedback: null
        },
        {
            id: 4,
            title: "Chapter 4: Leadership",
            date: null,
            status: "LOCKED",
            outcome: "Locked",
            insight: "Menunggu penyelesaian Chapter 3.",
            pmFeedback: null
        },
    ],
    traits: [
        { label: "Adaptability", value: 90, color: "bg-emerald-500" },
        { label: "Collaboration", value: 85, color: "bg-blue-500" },
        { label: "Ownership", value: 60, color: "bg-amber-500" },
        { label: "Resilience", value: 75, color: "bg-purple-500" }
    ],
    growth: {
        strength: "Kamu sangat kuat dalam **Adaptasi**. Perubahan mendadak tidak membuatmu panik, justru kamu melihatnya sebagai peluang.",
        stable: "Kolaborasimu stabil. Rekan tim merasa nyaman bekerja denganmu.",
        improve: "Fokus pengembangan selanjutnya adalah **Ownership**. Cobalah untuk mengambil inisiatif lebih pada proyek yang berisiko."
    }
};

const TEAM_DATA = {
    overview: "Tim menunjukkan engagement yang tinggi dalam fase Adaptasi, namun sedikit melambat di fase Ownership.",
    completionRate: 78,
    activeChapter: "Chapter 3: Ownership",
    timeline: [
        { id: 0, title: "Chapter 0: Welcome", status: "COMPLETED", stats: "100% Completed", insight: "Semua member onboard.", pmFeedback: null },
        { id: 1, title: "Chapter 1: Adaptation", status: "COMPLETED", stats: "95% Completed", insight: "Hampir semua lulus dengan baik.", pmFeedback: "Team showed great flexibility." },
        { id: 2, title: "Chapter 2: Contribution", status: "COMPLETED", stats: "80% Completed", insight: "Variasi partisipasi mulai terlihat.", pmFeedback: null },
        { id: 3, title: "Chapter 3: Ownership", status: "IN_PROGRESS", stats: "45% Active", insight: "Tantangan terbesar tim saat ini.", pmFeedback: "Needs more encouragement." },
        { id: 4, title: "Chapter 4: Leadership", status: "LOCKED", stats: "0% Unlocked", insight: "Belum tersedia untuk mayoritas.", pmFeedback: null },
    ],
    traits: [
        { label: "Team Cohesion", value: 88, color: "bg-indigo-500" },
        { label: "Innovation", value: 65, color: "bg-pink-500" },
        { label: "Execution", value: 72, color: "bg-cyan-500" }
    ]
};

export function CultureJourney({ onNavigate, viewMode = "PERSONAL", onToggleView, userRole }: CultureJourneyProps) {
    const isTeam = viewMode === "TEAM";
    const data = isTeam ? TEAM_DATA : PERSONAL_DATA;

    // Helper for View Toggle (Header consistency)
    const renderViewToggle = () => {
        if (userRole !== "hr" && userRole !== "pm" && userRole !== "admin") return null;

        return (
            <div className="flex bg-neutral-100 p-1 rounded-full">
                <button
                    onClick={() => onToggleView?.("PERSONAL")}
                    className={clsx(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                        !isTeam ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900"
                    )}
                >
                    <User className="w-4 h-4" />
                    Personal
                </button>
                <button
                    onClick={() => onToggleView?.("TEAM")}
                    className={clsx(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                        isTeam ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900"
                    )}
                >
                    <Users className="w-4 h-4" />
                    Team
                </button>
            </div>
        );
    };

    return (
        <div className="w-full pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. HEADER (Consistent w/ Home) */}
            <div className="space-y-4 mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">
                            {isTeam ? "Team Journey" : "Your Culture Journey"}
                        </h1>
                        <p className="text-sm text-neutral-500 mt-1">
                            {isTeam ? "Overview of your team's cultural progression." : "Reflecting on your growth and milestones at Adidaya."}
                        </p>
                    </div>
                    {renderViewToggle()}
                </div>
                <div className="border-b border-neutral-200" />
            </div>

            {/* 2. OVERVIEW SECTION */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 md:p-8 shadow-sm mb-12 relative overflow-hidden">
                <div className="flex flex-col md:flex-row gap-6 relative z-10">
                    {/* Stats Widget */}
                    <div className="flex-shrink-0 flex md:block gap-4 md:border-r border-neutral-100 md:pr-6 md:w-32">
                        <div>
                            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                                {isTeam ? "Avg Completion" : "Tenure"}
                            </div>
                            <div className="text-2xl font-bold text-neutral-900">
                                {isTeam ? `${(data as typeof TEAM_DATA).completionRate}%` : (data as typeof PERSONAL_DATA).tenure}
                            </div>
                        </div>
                        <div className="block md:hidden w-px bg-neutral-100" />
                        <div className="md:mt-4">
                            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Active</div>
                            <div className="text-sm font-medium text-blue-600">
                                {isTeam ? (data as typeof TEAM_DATA).activeChapter : `Chapter ${(data as typeof PERSONAL_DATA).timeline.find(t => t.status === "IN_PROGRESS")?.id ?? "-"}`}
                            </div>
                        </div>
                    </div>

                    {/* Narrative */}
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            {isTeam ? "Team Insight" : "Current Trajectory"}
                        </h3>
                        <p className="text-neutral-600 leading-relaxed">
                            {isTeam ? (data as typeof TEAM_DATA).overview : (data as typeof PERSONAL_DATA).narrative}
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. TIMELINE SECTION (Connected Vertical Line) */}
            <div className="mb-12 relative">
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-6">Chapter Timeline</h3>

                {/* Continuous Vertical Line */}
                <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-neutral-200" />

                <div className="space-y-8">
                    {data.timeline.map((step) => {
                        const isCompleted = step.status === "COMPLETED";
                        const isInProgress = step.status === "IN_PROGRESS";
                        const isLocked = step.status === "LOCKED";

                        return (
                            <div key={step.id} className="relative flex gap-6 group">
                                {/* Marker */}
                                <div className={clsx(
                                    "relative z-10 w-12 h-12 rounded-full border-4 flex items-center justify-center bg-white transition-all flex-shrink-0",
                                    isCompleted ? "border-emerald-100 text-emerald-600" :
                                        isInProgress ? "border-blue-100 text-blue-600 shadow-md shadow-blue-100" :
                                            "border-neutral-100 text-neutral-300"
                                )}>
                                    {isCompleted ? <CheckCircle className="w-5 h-5" /> :
                                        isLocked ? <Lock className="w-4 h-4" /> :
                                            <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />}
                                </div>

                                {/* Content Card */}
                                <div className={clsx(
                                    "flex-1 rounded-2xl border transition-all p-5 flex flex-col md:flex-row gap-6",
                                    isInProgress ? "bg-white border-blue-200 shadow-sm ring-1 ring-blue-50" :
                                        isCompleted ? "bg-white border-neutral-200 hover:border-neutral-300" :
                                            "bg-neutral-50 border-transparent opacity-60"
                                )}>
                                    {/* Left: Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={clsx(
                                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                                isCompleted ? "bg-emerald-50 text-emerald-700" :
                                                    isInProgress ? "bg-blue-50 text-blue-700" :
                                                        "bg-neutral-200 text-neutral-500"
                                            )}>
                                                {step.status.replace("_", " ")}
                                            </span>
                                            {(step as any).date && <span className="text-xs text-neutral-400">{(step as any).date}</span>}
                                        </div>
                                        <h4 className={clsx("text-lg font-bold mb-1", isLocked ? "text-neutral-500" : "text-neutral-900")}>
                                            {step.title}
                                        </h4>
                                        <p className="text-sm text-neutral-500">
                                            {isTeam ? (step as any).stats : step.insight}
                                        </p>
                                    </div>

                                    {/* Right: Outcome / PM Feedback */}
                                    {(isCompleted || isInProgress) && (
                                        <div className="md:w-1/3 md:border-l border-neutral-100 md:pl-6 flex flex-col justify-center space-y-3">
                                            {/* Quiz Outcome */}
                                            <div>
                                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                                                    Outcome
                                                </div>
                                                <div className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                                                    <Award className="w-4 h-4 text-amber-500" />
                                                    {(step as any).outcome ?? "On Track"}
                                                </div>
                                            </div>

                                            {/* PM Feedback (If exists) */}
                                            {(step as any).pmFeedback && (
                                                <div className="bg-neutral-50 rounded-lg p-3 relative">
                                                    <MessageSquareQuote className="w-4 h-4 text-neutral-400 absolute top-2 right-2" />
                                                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                                                        Note
                                                    </div>
                                                    <p className="text-xs text-neutral-600 italic leading-relaxed">
                                                        "{(step as any).pmFeedback}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 4. QUIZ SUMMARY (Traits) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                        <h3 className="font-bold text-neutral-900">
                            {isTeam ? "Team Traits" : "Dominant Traits"}
                        </h3>
                    </div>
                    <div className="space-y-4">
                        {data.traits.map((trait) => (
                            <div key={trait.label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-neutral-700">{trait.label}</span>
                                    <span className="text-neutral-500">{trait.value}%</span>
                                </div>
                                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                                    <div
                                        className={clsx("h-full rounded-full", trait.color)}
                                        style={{ width: `${trait.value}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. GROWTH INSIGHT (Reflection) */}
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 p-6 shadow-sm relative">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        <h3 className="font-bold text-blue-900">
                            {isTeam ? "Focus Areas" : "Growth Insight"}
                        </h3>
                    </div>

                    {isTeam ? (
                        <p className="text-sm text-blue-900/80 leading-relaxed">
                            Area kekuatan tim ini ada pada **Kohesi** dan **Eksekusi**. Tim sangat solid dalam menjalankan tugas yang sudah jelas.  Namun, **Inovasi** perlu didorong lebih lanjut. Cobalah tantang tim dengan masalah abstrak minggu ini.
                        </p>
                    ) : (
                        <div className="space-y-4 text-sm text-neutral-700 leading-relaxed">
                            <p>{(data as typeof PERSONAL_DATA).growth.strength}</p>
                            <p>{(data as typeof PERSONAL_DATA).growth.stable}</p>
                            <div className="bg-white/60 p-3 rounded-lg border border-blue-100">
                                <span className="font-bold text-blue-700 block mb-1 text-xs uppercase tracking-wider">To Improve</span>
                                {(data as typeof PERSONAL_DATA).growth.improve}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 6. ACTIONS */}
            {!isTeam && (
                <div className="flex justify-center pt-8 border-t border-neutral-200">
                    <Button
                        onClick={() => onNavigate("chapter")}
                        className="!rounded-full shadow-lg shadow-blue-500/20 pl-6 pr-4 h-12 whitespace-nowrap"
                    >
                        <div className="flex items-center gap-2">
                            Continue Active Chapter <ChevronRight className="w-4 h-4" />
                        </div>
                    </Button>
                </div>
            )}
        </div>
    );
}
