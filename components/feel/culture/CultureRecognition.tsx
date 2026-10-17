"use client";

import { useState } from "react";
import clsx from "clsx";
import {
    Heart,
    Send,
    User,
    Users,
    Award,
    Trophy,
    Sparkles,
    MessageSquare,
    Zap
} from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";

interface CultureRecognitionProps {
    onNavigate?: (section: string) => void;
    viewMode?: "PERSONAL" | "TEAM";
    onToggleView?: (mode: "PERSONAL" | "TEAM") => void;
    userRole?: string;
}

// --- MOCK DATA ---
const RECENT_RECOGNITIONS = [
    {
        id: 1,
        from: "Ardiansyah",
        to: "Siti Rahayu",
        value: "Helpfulness",
        message: "Thank you for staying late to help me finish the Q3 report. Your dedication is inspiring!",
        time: "2 hours ago",
        avatarFrom: "A",
        avatarTo: "S"
    },
    {
        id: 2,
        from: "Budi Santoso",
        to: "Design Team",
        value: "Innovation",
        message: "The new prototype is sleek and intuitive. Great job pushing the boundaries!",
        time: "5 hours ago",
        avatarFrom: "B",
        avatarTo: "D"
    },
    {
        id: 3,
        from: "Dewi Lestari",
        to: "Rizky Hidayat",
        value: "Ownership",
        message: "Taking full responsibility for the server migration was brave and well-executed.",
        time: "1 day ago",
        avatarFrom: "D",
        avatarTo: "R"
    }
];

const TEAM_STATS = {
    topValues: [
        { name: "Helpfulness", count: 42, color: "text-blue-600", bg: "bg-blue-50" },
        { name: "Innovation", count: 35, color: "text-purple-600", bg: "bg-purple-50" },
        { name: "Ownership", count: 28, color: "text-emerald-600", bg: "bg-emerald-50" }
    ],
    totalGiven: 156,
    activeContributors: "85%"
};

const PERSONAL_STATS = {
    received: 12,
    given: 8,
    topValue: "Helpfulness"
};

const VALUE_TAGS = ["Helpfulness", "Innovation", "Ownership", "Kindness", "Integrity", "Excellence"];

export function CultureRecognition({ onNavigate, viewMode = "PERSONAL", onToggleView, userRole }: CultureRecognitionProps) {
    const isTeam = viewMode === "TEAM";
    const [recipient, setRecipient] = useState("");
    const [selectedValue, setSelectedValue] = useState("");
    const [message, setMessage] = useState("");

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
                        <h1 className="text-2xl font-bold text-neutral-900">Recognition</h1>
                        <p className="text-sm text-neutral-500 mt-1">Appreciating Each Other</p>
                    </div>
                    {renderViewToggle()}
                </div>
                <div className="border-b border-neutral-200" />
            </div>

            {/* TEAM VIEW */}
            {isTeam ? (
                <div className="space-y-8">
                    {/* Team Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                            <h3 className="text-sm font-medium text-neutral-500 mb-2">Total Recognitions</h3>
                            <div className="text-3xl font-bold text-neutral-900">{TEAM_STATS.totalGiven}</div>
                            <div className="text-xs text-green-600 font-medium mt-1">↑ 12% from last month</div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                            <h3 className="text-sm font-medium text-neutral-500 mb-2">Active Contributors</h3>
                            <div className="text-3xl font-bold text-neutral-900">{TEAM_STATS.activeContributors}</div>
                            <div className="text-xs text-neutral-400 mt-1">of team members participated</div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                            <h3 className="text-sm font-medium text-neutral-500 mb-2">Most Celebrated Value</h3>
                            <div className="text-3xl font-bold text-blue-600">{TEAM_STATS.topValues[0].name}</div>
                            <div className="text-xs text-neutral-400 mt-1">{TEAM_STATS.topValues[0].count} mentions</div>
                        </div>
                    </div>

                    {/* Value Distribution */}
                    <div>
                        <h3 className="text-lg font-bold text-neutral-900 mb-4">Top Values Celebrated</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {TEAM_STATS.topValues.map((v, i) => (
                                <div key={v.name} className="bg-white p-4 rounded-xl border border-neutral-200 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg", v.bg, v.color)}>
                                            {i + 1}
                                        </div>
                                        <span className="font-semibold text-neutral-900">{v.name}</span>
                                    </div>
                                    <span className="text-lg font-bold text-neutral-500">{v.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Feed (Read Only) */}
                    <div>
                        <h3 className="text-lg font-bold text-neutral-900 mb-4">Latest Team Activity</h3>
                        <div className="space-y-4">
                            {RECENT_RECOGNITIONS.map((recognition) => (
                                <div key={recognition.id} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4 items-start">
                                    <div className="flex items-center gap-2 md:w-48 flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-xs text-neutral-500 border border-neutral-200">
                                            {recognition.avatarFrom}
                                        </div>
                                        <span className="text-neutral-400 text-xs">➜</span>
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-xs text-blue-600 border border-blue-200">
                                            {recognition.avatarTo}
                                        </div>
                                        <div className="flex flex-col ml-2">
                                            <span className="text-xs font-bold text-neutral-900">{recognition.to}</span>
                                            <span className="text-[10px] text-neutral-400">{recognition.time}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="mb-2">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-50 text-yellow-700 border border-yellow-100">
                                                <Award className="w-3 h-3" /> {recognition.value}
                                            </span>
                                        </div>
                                        <p className="text-sm text-neutral-600 leading-relaxed italic">"{recognition.message}"</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* PERSONAL VIEW */
                <div className="max-w-2xl mx-auto space-y-12">

                    {/* 1. GIVE RECOGNITION FORM */}
                    <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm">
                        <h2 className="text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-yellow-500" />
                            Give Recognition
                        </h2>

                        <div className="space-y-6">
                            {/* Recipient */}
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Recipient</label>
                                <select
                                    className="w-full p-3 rounded-lg border border-neutral-200 bg-white text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
                                    value={recipient}
                                    onChange={(e) => setRecipient(e.target.value)}
                                >
                                    <option value="">Select a colleague or team...</option>
                                    <option value="Siti">Siti Rahayu</option>
                                    <option value="Budi">Budi Santoso</option>
                                    <option value="Dewi">Dewi Lestari</option>
                                    <option value="Team">Design Team</option>
                                </select>
                            </div>

                            {/* Value Tag */}
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Related Value</label>
                                <div className="flex flex-wrap gap-2">
                                    {VALUE_TAGS.map((val) => (
                                        <button
                                            key={val}
                                            onClick={() => setSelectedValue(val)}
                                            className={clsx(
                                                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                                selectedValue === val
                                                    ? "bg-yellow-100 border-yellow-300 text-yellow-800"
                                                    : "bg-white border-neutral-200 text-neutral-500 hover:border-yellow-200 hover:text-neutral-700"
                                            )}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Message</label>
                                <textarea
                                    className="w-full p-4 rounded-lg border border-neutral-200 text-sm focus:ring-2 focus:ring-yellow-400 outline-none min-h-[120px] placeholder:text-neutral-400"
                                    placeholder="What behavior are you appreciating? Be specific and sincere..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <p className="text-xs text-neutral-400 mt-2 text-right">Visible to the team • 1-2 sentences recommended</p>
                            </div>

                            {/* Submit */}
                            <div className="pt-2">
                                <Button
                                    className="w-full !rounded-full bg-neutral-900 hover:bg-neutral-800 text-white py-6 text-sm font-bold shadow-lg"
                                    icon={<Send className="w-4 h-4" />}
                                    disabled={!recipient || !selectedValue || !message}
                                    onClick={() => {
                                        alert("Recognition sent!");
                                        setRecipient("");
                                        setSelectedValue("");
                                        setMessage("");
                                    }}
                                >
                                    Send Recognition
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* 2. RECENT RECOGNITIONS FEED */}
                    <div>
                        <h3 className="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            Recent Recognitions
                        </h3>
                        <div className="space-y-6">
                            {RECENT_RECOGNITIONS.map((item) => (
                                <div key={item.id} className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-yellow-400 to-orange-400" />

                                    <div className="pl-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-sm text-neutral-600 border border-neutral-200">
                                                    {item.avatarFrom}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-neutral-900">{item.from}</span>
                                                    <span className="text-xs text-neutral-400">recognized <span className="text-neutral-900 font-medium">{item.to}</span></span>
                                                </div>
                                            </div>
                                            <span className="text-xs text-neutral-400">{item.time}</span>
                                        </div>

                                        <div className="mb-4 pl-13">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider mb-2 border border-purple-100">
                                                <Zap className="w-3 h-3" /> {item.value}
                                            </div>
                                            <p className="text-neutral-700 leading-relaxed">"{item.message}"</p>
                                        </div>

                                        <div className="border-t border-neutral-100 pt-3 flex items-center gap-4">
                                            <button className="text-xs font-semibold text-neutral-400 flex items-center gap-1 hover:text-red-500 transition-colors">
                                                <Heart className="w-3 h-3" /> Like
                                            </button>
                                            <button className="text-xs font-semibold text-neutral-400 flex items-center gap-1 hover:text-blue-500 transition-colors">
                                                <MessageSquare className="w-3 h-3" /> Comment
                                            </button>
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
