"use client";

import React from "react";
import clsx from "clsx";
import { File } from "lucide-react";

// ─── SidebarNavItem ──────────────────────────────────────────────
export function SidebarNavItem({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactElement; label: string; badge?: number }) {
    const styledIcon = React.cloneElement(icon, {
        className: clsx("w-4 h-4 transition-colors", active ? "text-blue-600 dark:text-blue-400" : "text-neutral-400 dark:text-neutral-500")
    });

    return (
        <button
            onClick={onClick}
            className={clsx(
                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all",
                active
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 font-semibold"
            )}
        >
            <div className="flex items-center gap-2.5">
                {styledIcon}
                <span className="text-[13px]">{label}</span>
            </div>
            {badge !== undefined && badge > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {badge}
                </span>
            )}
        </button>
    );
}

// ─── WorkspaceSubNavItem ─────────────────────────────────────────
export function WorkspaceSubNavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactElement; label: string }) {
    const styledIcon = React.cloneElement(icon, {
        className: clsx("w-3.5 h-3.5 transition-colors", active ? "text-blue-600 dark:text-blue-400" : "text-neutral-400 dark:text-neutral-500")
    });

    return (
        <button
            onClick={onClick}
            className={clsx(
                "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-left transition-all text-[12px]",
                active
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/40 dark:hover:bg-neutral-800/40 font-medium"
            )}
        >
            {styledIcon}
            <span>{label}</span>
        </button>
    );
}

// ─── SubTabButton ────────────────────────────────────────────────
export function SubTabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap",
                active
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50"
            )}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

// ─── PromptOption ────────────────────────────────────────────────
export function PromptOption({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "flex items-center gap-3.5 w-full px-4 py-3 rounded-2xl transition-all text-left",
                "bg-transparent hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50",
                "border border-neutral-200/60 dark:border-neutral-700/40",
                "active:scale-[0.99]"
            )}
        >
            <div className="shrink-0">{icon}</div>
            <span className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300 leading-snug line-clamp-1">
                {title}
            </span>
        </button>
    );
}

// ─── FileCard ────────────────────────────────────────────────────
export function FileCard({ name, size }: { name: string; size: string }) {
    return (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl border border-white/60 dark:border-neutral-800/40">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                <File className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
                <h4 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 truncate font-mono">
                    {name}
                </h4>
                <p className="text-[10px] text-neutral-400 font-medium">{size}</p>
            </div>
        </div>
    );
}
