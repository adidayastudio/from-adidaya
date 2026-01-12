"use client";

import { User, Users, ArrowRight, BookOpen, CheckCircle, Clock, Heart } from "lucide-react";
import clsx from "clsx";
import { Button } from "@/shared/ui/primitives/button/button";

interface CultureHomeProps {
    onNavigate: (section: string) => void;
    viewMode: "PERSONAL" | "TEAM";
    onToggleView: (mode: "PERSONAL" | "TEAM") => void;
    userRole: string;
}

export function CultureHome({ onNavigate, viewMode, onToggleView, userRole }: CultureHomeProps) {
    const isHr = userRole === "hr";

    // Mock user progress
    const user = {
        name: "Ardiansyah",
        tenure: "3 months",
        activeChapter: {
            id: 1,
            title: "Adaptation",
            description: "Memahami cara kerja tim dan ritme di Adidaya.",
            progress: 65,
            totalModules: 4,
            completedModules: 2
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* HEADER (Matching ClockOverview) */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">Culture</h1>
                        <p className="text-sm text-neutral-500 mt-1">Your journey, values, and life at Adidaya.</p>
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

            {/* Hero Greeting */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Selamat datang, {user.name}!</h1>
                    <p className="text-blue-100 text-lg mb-6">
                        Kamu sudah bersama Adidaya selama <span className="font-semibold text-white">{user.tenure}</span>.
                        <br />Perjalananmu baru saja dimulai.
                    </p>
                    <Button
                        variant="secondary"
                        className="!bg-white !text-blue-700 !border-none hover:!bg-blue-50"
                        onClick={() => onNavigate("chapter")}
                        icon={<ArrowRight className="w-4 h-4" />}
                    >
                        Lanjutkan Chapter Ini
                    </Button>
                </div>
            </div>

            {/* Active Chapter Card */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-neutral-900">Chapter Aktif</h2>
                    <span className="text-sm text-neutral-500">Chapter {user.activeChapter.id} of 5</span>
                </div>

                <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate("chapter")}>
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold mb-2">
                                IN PROGRESS
                            </span>
                            <h3 className="text-2xl font-bold text-neutral-900">{user.activeChapter.title}</h3>
                            <p className="text-neutral-600 mt-1">{user.activeChapter.description}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <BookOpen className="w-6 h-6" />
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-neutral-700">{user.activeChapter.progress}% Completed</span>
                            <span className="text-neutral-500">{user.activeChapter.completedModules}/{user.activeChapter.totalModules} Modules</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${user.activeChapter.progress}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => onNavigate("values")} className="bg-white p-5 rounded-2xl border border-neutral-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Heart className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold text-neutral-900 mb-1">Core Values</h4>
                    <p className="text-sm text-neutral-500">Nilai-nilai utama kita.</p>
                </button>

                <button onClick={() => onNavigate("journey")} className="bg-white p-5 rounded-2xl border border-neutral-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all text-left group">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Clock className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold text-neutral-900 mb-1">My Journey</h4>
                    <p className="text-sm text-neutral-500">Timeline masa kerjamu.</p>
                </button>

                <button onClick={() => onNavigate("pulse")} className="bg-white p-5 rounded-2xl border border-neutral-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left group">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold text-neutral-900 mb-1">Pulse Check</h4>
                    <p className="text-sm text-neutral-500">Bagaimana perasaanmu?</p>
                </button>
            </div>
        </div>
    );
}
