"use client";

import { useRef, useEffect, useState } from "react";
import clsx from "clsx";
import { User, Users } from "lucide-react";
import { useFinance } from "./FinanceContext";

export function FinanceViewToggle() {
    const { viewMode, setViewMode, canAccessTeam, isLoading } = useFinance();
    const personalRef = useRef<HTMLButtonElement>(null);
    const teamRef = useRef<HTMLButtonElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });

    useEffect(() => {
        const activeRef = viewMode === "personal" ? personalRef : teamRef;
        if (activeRef.current) {
            setIndicatorStyle({
                width: activeRef.current.offsetWidth,
                left: activeRef.current.offsetLeft,
            });
        }
    }, [viewMode]);

    // Staff only sees personal view, no toggle needed
    if (!canAccessTeam || isLoading) return null;

    return (
        <div
            className="relative inline-flex p-1 rounded-full h-10"
            style={{
                background: 'rgba(0, 0, 0, 0.06)',
            }}
        >
            {/* Sliding indicator */}
            <div
                className="absolute top-1 bottom-1 rounded-full bg-white shadow-sm transition-all duration-300 ease-out"
                style={{
                    width: `${indicatorStyle.width}px`,
                    left: `${indicatorStyle.left}px`,
                }}
            />

            {/* Buttons - content width + px-3 padding */}
            <button
                ref={personalRef}
                onClick={() => setViewMode("personal")}
                className={clsx(
                    "relative z-10 flex items-center gap-2 px-3 h-full rounded-full text-sm font-medium transition-colors duration-200",
                    viewMode === "personal"
                        ? "text-neutral-900"
                        : "text-neutral-500 hover:text-neutral-700"
                )}
            >
                <User className="w-4 h-4" /> Personal
            </button>
            <button
                ref={teamRef}
                onClick={() => setViewMode("team")}
                className={clsx(
                    "relative z-10 flex items-center gap-2 px-3 h-full rounded-full text-sm font-medium transition-colors duration-200",
                    viewMode === "team"
                        ? "text-neutral-900"
                        : "text-neutral-500 hover:text-neutral-700"
                )}
            >
                <Users className="w-4 h-4" /> Team
            </button>
        </div>
    );
}
