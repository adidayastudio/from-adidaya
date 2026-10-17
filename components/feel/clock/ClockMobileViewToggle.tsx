"use client";

import clsx from "clsx";
import { User, Users } from "lucide-react";
import { useClockContext } from "./ClockContext";

/**
 * Floating sticky toggle for Personal/Team view on mobile
 * Compact chip that sits below nav bar
 */
export default function ClockMobileViewToggle() {
    const { viewMode, setViewMode, canAccessTeam, isLoading } = useClockContext();

    // Staff only sees personal view, no toggle needed
    if (!canAccessTeam || isLoading) return null;

    const isPersonal = viewMode === "personal";

    return (
        <div className="fixed top-[72px] right-3 z-30 md:hidden">
            <button
                onClick={() => setViewMode(isPersonal ? "team" : "personal")}
                className="flex items-center gap-1 h-7 px-2 pr-1.5 rounded-full backdrop-blur-xl border border-neutral-200/80 shadow-sm transition-all active:scale-95"
                style={{
                    background: 'rgba(255,255,255,0.9)',
                }}
            >
                {/* Small icon */}
                {isPersonal ? (
                    <User className="w-3.5 h-3.5 text-blue-600" strokeWidth={2} />
                ) : (
                    <Users className="w-3.5 h-3.5 text-rose-600" strokeWidth={2} />
                )}

                {/* Label */}
                <span className="text-[11px] font-semibold text-neutral-600">
                    {isPersonal ? "Me" : "Team"}
                </span>

                {/* Swap icon */}
                <svg
                    className="w-3 h-3 text-neutral-300 ml-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            </button>
        </div>
    );
}
