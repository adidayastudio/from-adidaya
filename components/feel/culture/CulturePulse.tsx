"use client";

import { useState } from "react";
import clsx from "clsx";
import {
    Heart,
    Smile,
    Meh,
    Frown,
    ThumbsUp,
    Send,
    User,
    Users,
    BarChart3,
    MessageCircle,
    PartyPopper,
    Sparkles
} from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";

interface CulturePulseProps {
    onNavigate?: (section: string) => void;
    viewMode?: "PERSONAL" | "TEAM";
    onToggleView?: (mode: "PERSONAL" | "TEAM") => void;
    userRole?: string;
}

// --- MOCK DATA ---
const RECENT_FEED = [
    {
        id: 1,
        from: "Ardiansyah",
        to: "Siti Rahayu",
        value: "Helpfulness",
        message: "Thanks for helping me debug that tricky API issue yesterday! You're a lifesaver.",
        time: "2 hours ago",
        avatar: "S"
    },
    {
        id: 2,
        from: "Budi Santoso",
        to: "Design Team",
        value: "Creativity",
        message: "The new dashboard concepts look amazing. Great work pushing the boundaries!",
        time: "5 hours ago",
        avatar: "D"
    },
    {
        id: 3,
        from: "Dewi Lestari",
        to: "Ardiansyah",
        value: "Ownership",
        message: "Appreciate you taking lead on the client migration project.",
        time: "1 day ago",
        avatar: "A"
    }
];

const TEAM_STATS = {
    mood: [
        { label: "Great", count: 12, color: "bg-emerald-500" },
        { label: "Good", count: 8, color: "bg-blue-500" },
        { label: "Okay", count: 3, color: "bg-yellow-500" },
        { label: "Struggling", count: 1, color: "bg-red-500" },
    ],
    topValues: [
        { name: "Helpfulness", count: 15 },
        { name: "Ownership", count: 12 },
        { name: "Creativity", count: 8 }
    ]
};

export function CulturePulse({ onNavigate, viewMode = "PERSONAL", onToggleView, userRole }: CulturePulseProps) {
    const isTeam = viewMode === "TEAM";
    const [mood, setMood] = useState<string | null>(null);
    const [recognitionText, setRecognitionText] = useState("");
    const [selectedPeer, setSelectedPeer] = useState("");
    const [selectedValue, setSelectedValue] = useState("");

    // Helper for View Toggle
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
            {/* 1. HEADER */}
            <div className="space-y-4 mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">Pulse</h1>
                        <p className="text-sm text-neutral-500 mt-1">How We’re Feeling & Appreciating Each Other</p>
                    </div>
                    {renderViewToggle()}
                </div>
                <div className="border-b border-neutral-200" />
            </div>

            {/* TEAM VIEW */}
            {isTeam ? (
                <div className="space-y-8">
                    {/* Team Mood */}
                    <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm">
                        <h3 className="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-neutral-500" />
                            Team Mood Overview
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Sentiment Distribution</h4>
                                <div className="space-y-3">
                                    {TEAM_STATS.mood.map((m) => (
                                        <div key={m.label} className="flex items-center gap-3">
                                            <div className="w-20 text-sm font-medium text-neutral-600">{m.label}</div>
                                            <div className="flex-1 h-3 bg-neutral-100 rounded-full overflow-hidden">
                                                <div
                                                    className={clsx("h-full rounded-full", m.color)}
                                                    style={{ width: `${(m.count / 24) * 100}%` }}
                                                />
                                            </div>
                                            <div className="w-8 text-sm text-neutral-500 text-right">{m.count}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Top Values Celebrated</h4>
                                <div className="space-y-4">
                                    {TEAM_STATS.topValues.map((v, i) => (
                                        <div key={v.name} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center font-bold text-xs shadow-sm text-neutral-500">
                                                    {i + 1}
                                                </div>
                                                <span className="font-medium text-neutral-900">{v.name}</span>
                                            </div>
                                            <div className="text-sm font-bold text-neutral-500">{v.count}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Team Feed (Read Only Aggregated) */}
                    <div>
                        <h3 className="text-lg font-bold text-neutral-900 mb-4">Recent Recognitions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {RECENT_FEED.map((item) => (
                                <div key={item.id} className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                                {item.avatar}
                                            </div>
                                            <span className="text-sm font-bold text-neutral-900">{item.to}</span>
                                        </div>
                                        <span className="text-xs text-neutral-400">{item.time}</span>
                                    </div>
                                    <div className="mb-3">
                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700">
                                            {item.value}
                                        </span>
                                    </div>
                                    <p className="text-sm text-neutral-600 italic">"{item.message}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* PERSONAL VIEW */
                <div className="max-w-2xl mx-auto space-y-12">

                    {/* 2. QUICK PULSE CHECK */}
                    <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm text-center">
                        <h2 className="text-xl font-bold text-neutral-900 mb-2">How are you feeling this week?</h2>
                        <p className="text-neutral-500 mb-8 max-w-md mx-auto">Check-in with yourself. Your response helps us understand the team's overall wellbeing.</p>

                        <div className="flex justify-center gap-4 md:gap-8 mb-8">
                            {[
                                { icon: Smile, label: "Great", color: "text-emerald-500", bg: "bg-emerald-50", ring: "ring-emerald-200" },
                                { icon: Meh, label: "Okay", color: "text-blue-500", bg: "bg-blue-50", ring: "ring-blue-200" },
                                { icon: Frown, label: "Not Great", color: "text-orange-500", bg: "bg-orange-50", ring: "ring-orange-200" },
                            ].map((opt) => {
                                const Icon = opt.icon;
                                const isSelected = mood === opt.label;
                                return (
                                    <button
                                        key={opt.label}
                                        onClick={() => setMood(opt.label)}
                                        className={clsx(
                                            "flex flex-col items-center gap-2 group transition-all duration-300",
                                            isSelected ? "scale-110" : "hover:scale-105 opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-16 h-16 rounded-2xl flex items-center justify-center transition-all",
                                            isSelected ? `ring-4 ${opt.ring} ${opt.bg} ${opt.color}` : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100"
                                        )}>
                                            <Icon className={clsx("w-8 h-8", isSelected && "fill-current")} />
                                        </div>
                                        <span className={clsx("text-sm font-medium", isSelected ? "text-neutral-900" : "text-neutral-400")}>
                                            {opt.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {mood && (
                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                <textarea
                                    className="w-full max-w-md p-3 rounded-lg border border-neutral-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-neutral-400"
                                    placeholder="Anything on your mind? (Optional & Private)"
                                    rows={2}
                                />
                                <div className="mt-4">
                                    <Button
                                        className="!rounded-full px-8 bg-neutral-900"
                                        onClick={() => alert("Pulse submitted!")}
                                    >
                                        Submit Check-in
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. RECOGNITION */}
                    <div>
                        <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                            <PartyPopper className="w-5 h-5 text-purple-500" />
                            Give Recognition
                        </h3>
                        <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-100 p-6 md:p-8 shadow-sm">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Who do you want to appreciate?</label>
                                    <select
                                        className="w-full p-3 rounded-lg border border-neutral-200 bg-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                        value={selectedPeer}
                                        onChange={(e) => setSelectedPeer(e.target.value)}
                                    >
                                        <option value="">Select a colleague...</option>
                                        <option value="Siti">Siti Rahayu</option>
                                        <option value="Budi">Budi Santoso</option>
                                        <option value="Team">Design Team</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Related Value</label>
                                    <div className="flex flex-wrap gap-2">
                                        {["Helpfulness", "Creativity", "Ownership", "Kindness"].map((val) => (
                                            <button
                                                key={val}
                                                onClick={() => setSelectedValue(val)}
                                                className={clsx(
                                                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                                    selectedValue === val
                                                        ? "bg-purple-100 border-purple-200 text-purple-700"
                                                        : "bg-white border-neutral-200 text-neutral-500 hover:border-purple-200"
                                                )}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Message</label>
                                    <textarea
                                        className="w-full p-3 rounded-lg border border-neutral-200 text-sm focus:ring-2 focus:ring-purple-500 outline-none min-h-[100px]"
                                        placeholder="Write a short message of appreciation..."
                                        value={recognitionText}
                                        onChange={(e) => setRecognitionText(e.target.value)}
                                    />
                                </div>

                                <div className="text-right">
                                    <Button
                                        className="!rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200"
                                        icon={<Send className="w-4 h-4" />}
                                        disabled={!selectedPeer || !recognitionText || !selectedValue}
                                    >
                                        Give Recognition
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. FEED */}
                    <div>
                        <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            Recent Appreciations
                        </h3>
                        <div className="space-y-4">
                            {RECENT_FEED.map((item) => (
                                <div key={item.id} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex-shrink-0 flex items-center justify-center font-bold text-neutral-500">
                                        {item.avatar}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline justify-between mb-1">
                                            <h4 className="text-sm font-bold text-neutral-900">
                                                {item.from} <span className="text-neutral-400 font-normal">to</span> {item.to}
                                            </h4>
                                            <span className="text-xs text-neutral-400">{item.time}</span>
                                        </div>
                                        <p className="text-sm text-neutral-700 mb-2">"{item.message}"</p>
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-50 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                                            <Heart className="w-3 h-3 text-red-400" /> {item.value}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
