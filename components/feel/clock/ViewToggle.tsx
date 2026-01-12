"use client";

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

    return (
        <div className="flex items-center bg-neutral-100 rounded-full p-1">
            <button
                onClick={() => onViewChange("personal")}
                className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                    viewMode === "personal"
                        ? "bg-white shadow text-neutral-900"
                        : "text-neutral-500 hover:text-neutral-700"
                )}
            >
                <User className="w-4 h-4" /> Personal
            </button>
            <button
                onClick={() => onViewChange("team")}
                className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                    viewMode === "team"
                        ? "bg-white shadow text-neutral-900"
                        : "text-neutral-500 hover:text-neutral-700"
                )}
            >
                <Users className="w-4 h-4" /> Team
            </button>
        </div>
    );
}
