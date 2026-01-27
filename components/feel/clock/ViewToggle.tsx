"use client";

import { useRef, useEffect, useState } from "react";
import clsx from "clsx";
import { User, Users } from "lucide-react";
import { UserRole } from "@/hooks/useUserProfile";
import { canViewTeamData } from "@/lib/auth-utils";

interface ViewToggleProps {
    viewMode: "personal" | "team";
    onViewChange: (mode: "personal" | "team") => void;
    role?: UserRole;
}

export function ViewToggle({ viewMode, onViewChange, role }: ViewToggleProps) {
    const isManager = canViewTeamData(role);

    // Staff only sees personal view, no toggle needed
    if (!isManager) return null;

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

    if (!isManager) return null;

    return (
        <div className="relative inline-flex p-1 rounded-full h-10 bg-neutral-100/80 backdrop-blur-sm border border-neutral-200/50 shadow-sm">
            {/* Sliding indicator */}
            <div
                className="absolute top-1 bottom-1 rounded-full bg-white shadow-md transition-all duration-300 ease-out"
                style={{
                    width: `${indicatorStyle.width}px`,
                    left: `${indicatorStyle.left}px`,
                }}
            />

            <button
                ref={personalRef}
                onClick={() => onViewChange("personal")}
                className={clsx(
                    "relative z-10 flex items-center gap-2 px-4 h-full rounded-full text-sm font-medium transition-colors duration-200",
                    viewMode === "personal"
                        ? "text-neutral-900"
                        : "text-neutral-500 hover:text-neutral-700"
                )}
            >
                <User className="w-4 h-4" /> Personal
            </button>
            <button
                ref={teamRef}
                onClick={() => onViewChange("team")}
                className={clsx(
                    "relative z-10 flex items-center gap-2 px-4 h-full rounded-full text-sm font-medium transition-colors duration-200",
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
