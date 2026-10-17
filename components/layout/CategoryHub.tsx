"use client";

import Link from "next/link";
import { ArrowRight, LucideIcon, Inbox } from "lucide-react";
import clsx from "clsx";
import { useTheme } from "next-themes";

interface AppCardProps {
    label: string;
    href: string;
    icon: LucideIcon;
    color: string;
    snippet?: string;
    count?: number;
}

// Theme configuration for each category
const CATEGORY_THEMES = {
    FRAME: {
        gradient: "from-orange-200 via-orange-100 to-amber-50",
        darkGradient: "from-orange-950/40 via-orange-900/20 to-neutral-950",
        iconBg: "from-orange-100/80 to-orange-50/40",
        darkIconBg: "from-orange-500/20 to-orange-500/10",
        iconBorder: "border-orange-200/40",
        darkIconBorder: "dark:border-orange-500/20",
        labelColor: "text-orange-700 dark:text-orange-400",
        accentColor: "text-orange-500 dark:text-orange-400",
        textColor: "text-orange-900 dark:text-orange-200",
        subtextColor: "text-orange-700/70 dark:text-orange-300/60",
    },
    FLOW: {
        gradient: "from-red-200 via-red-100 to-rose-50",
        darkGradient: "from-red-950/40 via-red-900/20 to-neutral-950",
        iconBg: "from-red-100/80 to-red-50/40",
        darkIconBg: "from-red-500/20 to-red-500/10",
        iconBorder: "border-red-200/40",
        darkIconBorder: "dark:border-red-500/20",
        labelColor: "text-red-700 dark:text-red-400",
        accentColor: "text-red-500 dark:text-red-400",
        textColor: "text-red-900 dark:text-red-200",
        subtextColor: "text-red-700/70 dark:text-red-300/60",
    },
    FEEL: {
        gradient: "from-blue-200 via-blue-100 to-sky-50",
        darkGradient: "from-blue-950/40 via-blue-900/20 to-neutral-950",
        iconBg: "from-blue-100/80 to-blue-50/40",
        darkIconBg: "from-blue-500/20 to-blue-500/10",
        iconBorder: "border-blue-200/40",
        darkIconBorder: "dark:border-blue-500/20",
        labelColor: "text-blue-700 dark:text-blue-400",
        accentColor: "text-blue-500 dark:text-blue-400",
        textColor: "text-blue-900 dark:text-blue-200",
        subtextColor: "text-blue-700/70 dark:text-blue-300/60",
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
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    const glassBg = isDark
        ? 'linear-gradient(180deg, rgba(30,30,30,0.9) 0%, rgba(23,23,23,0.75) 100%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)';

    return (
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
            {/* iOS 26 STYLE SOFT THEMED BANNER */}
            <div className={clsx(
                "relative pt-14 pb-20 px-4",
                "bg-gradient-to-br",
                isDark ? theme.darkGradient : theme.gradient
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

            {/* iOS 26 GLASS APP BUTTONS WIDGET */}
            <div className="relative z-10 -mt-12 px-4 mb-6">
                <div
                    className="backdrop-blur-xl rounded-[28px] shadow-xl shadow-black/[0.05] dark:shadow-none border border-white/50 dark:border-neutral-800 py-4 px-2 overflow-x-auto scrollbar-hide"
                    style={{ background: glassBg }}
                >
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
                                            `bg-gradient-to-br ${isDark ? theme.darkIconBg : theme.iconBg}`,
                                            theme.iconBorder,
                                            theme.darkIconBorder
                                        )}
                                    >
                                        <Icon className={clsx("w-5 h-5", theme.accentColor)} strokeWidth={1.5} />
                                    </div>
                                    <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 text-center">
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
                <h2 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest px-1">
                    Overview
                </h2>

                <div
                    className="backdrop-blur-xl rounded-[24px] shadow-sm dark:shadow-none border border-white/50 dark:border-neutral-800 p-8 flex flex-col items-center justify-center min-h-[200px]"
                    style={{ background: glassBg }}
                >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neutral-100/80 to-neutral-50/40 dark:from-neutral-800 dark:to-neutral-800/50 border border-neutral-200/40 dark:border-neutral-700 flex items-center justify-center mb-4">
                        <Inbox className="w-7 h-7 text-neutral-300 dark:text-neutral-600" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500 text-center">
                        No {category.toLowerCase()} data yet
                    </p>
                    <p className="text-xs text-neutral-300 dark:text-neutral-600 text-center mt-1 max-w-xs">
                        Overview content will appear here once you start using the apps above.
                    </p>
                </div>
            </div>
        </div>
    );
}
