"use client";

import Link from "next/link";
import { ArrowRight, LucideIcon, Inbox } from "lucide-react";
import clsx from "clsx";

interface AppCardProps {
    label: string;
    href: string;
    icon: LucideIcon;
    color: string;
    snippet?: string;
    count?: number;
}

// Theme configuration for each category - SOFT COLORS
const CATEGORY_THEMES = {
    FRAME: {
        gradient: "from-orange-200 via-orange-100 to-amber-50",
        iconBg: "from-orange-100/80 to-orange-50/40",
        iconBorder: "border-orange-200/40",
        labelColor: "text-orange-700",
        accentColor: "text-orange-500",
        textColor: "text-orange-900",
        subtextColor: "text-orange-700/70",
    },
    FLOW: {
        gradient: "from-red-200 via-red-100 to-rose-50",
        iconBg: "from-red-100/80 to-red-50/40",
        iconBorder: "border-red-200/40",
        labelColor: "text-red-700",
        accentColor: "text-red-500",
        textColor: "text-red-900",
        subtextColor: "text-red-700/70",
    },
    FEEL: {
        gradient: "from-blue-200 via-blue-100 to-sky-50",
        iconBg: "from-blue-100/80 to-blue-50/40",
        iconBorder: "border-blue-200/40",
        labelColor: "text-blue-700",
        accentColor: "text-blue-500",
        textColor: "text-blue-900",
        subtextColor: "text-blue-700/70",
    },
} as const;

export default function CategoryHub({
    title,
    description,
    apps,
    category
}: {
    title: string;
    description: string;
    apps: AppCardProps[];
    category: "FRAME" | "FLOW" | "FEEL";
}) {
    const theme = CATEGORY_THEMES[category] || CATEGORY_THEMES.FRAME;

    return (
        <div className="min-h-screen bg-neutral-100">
            {/* iOS 26 STYLE SOFT THEMED BANNER */}
            <div className={clsx(
                "relative pt-14 pb-20 px-4",
                "bg-gradient-to-br",
                theme.gradient
            )}>
                <div className="max-w-lg mx-auto text-center">
                    <span className={clsx("text-xs font-semibold uppercase tracking-widest", theme.labelColor)}>
                        {category}
                    </span>
                    <h1 className={clsx("text-2xl font-bold tracking-tight mt-1", theme.textColor)}>
                        {title}
                    </h1>
                    <p className={clsx("text-sm mt-2 max-w-xs mx-auto", theme.subtextColor)}>
                        {description}
                    </p>
                </div>
            </div>

            {/* iOS 26 GLASS APP BUTTONS WIDGET - SCROLLABLE */}
            <div className="relative z-10 -mt-12 px-4 mb-6">
                <div
                    className="backdrop-blur-xl rounded-[28px] shadow-xl shadow-black/[0.05] border border-white/50 py-4 px-2 overflow-x-auto scrollbar-hide"
                    style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)' }}
                >
                    {/* Horizontal scrollable row */}
                    <div className="flex gap-1 w-max mx-auto">
                        {apps.map((app) => {
                            const Icon = app.icon;
                            return (
                                <Link
                                    key={app.label}
                                    href={app.href}
                                    className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl active:scale-95 transition-all relative flex-shrink-0"
                                >
                                    <div
                                        className={clsx(
                                            "w-12 h-12 rounded-[14px] flex items-center justify-center backdrop-blur-sm border shadow-sm",
                                            `bg-gradient-to-br ${theme.iconBg}`,
                                            theme.iconBorder
                                        )}
                                    >
                                        <Icon className={clsx("w-5 h-5", theme.accentColor)} strokeWidth={1.5} />
                                    </div>
                                    <span className="text-[10px] font-medium text-neutral-600 text-center">
                                        {app.label}
                                    </span>
                                    {app.count !== undefined && app.count > 0 && (
                                        <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                                            {app.count}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* OVERVIEW CONTENT - Empty State */}
            <div className="px-4 pb-32 space-y-4">
                <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">
                    Overview
                </h2>

                <div
                    className="backdrop-blur-xl rounded-[24px] shadow-sm border border-white/50 p-8 flex flex-col items-center justify-center min-h-[200px]"
                    style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)' }}
                >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neutral-100/80 to-neutral-50/40 border border-neutral-200/40 flex items-center justify-center mb-4">
                        <Inbox className="w-7 h-7 text-neutral-300" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm font-medium text-neutral-400 text-center">
                        No {category.toLowerCase()} data yet
                    </p>
                    <p className="text-xs text-neutral-300 text-center mt-1 max-w-xs">
                        Overview content will appear here once you start using the apps above.
                    </p>
                </div>
            </div>
        </div>
    );
}
