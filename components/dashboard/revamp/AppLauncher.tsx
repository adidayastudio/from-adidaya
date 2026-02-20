"use client";

import Link from "next/link";
import clsx from "clsx";
import {
    Globe,
    Share2,
    GraduationCap,
    FolderKanban,
    Banknote,
    Package,
    User,
    Users,
    Clock,
    Briefcase,
    HardHat,
    Sparkles,
    Calendar,
    Activity,
    ChevronDown,
    Settings2,
} from "lucide-react";

const APPS = [
    { label: "Projects", href: "/flow/projects", icon: FolderKanban, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
    { label: "Finance", href: "/flow/finance", icon: Banknote, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
    { label: "Tracking", href: "/flow/tracking", icon: Activity, color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    { label: "People", href: "/feel/people", icon: Users, color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10" },
    { label: "Clock", href: "/feel/clock", icon: Clock, color: "text-rose-500 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10" },
    { label: "Crew", href: "/feel/crew", icon: HardHat, color: "text-indigo-500 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
    { label: "Website", href: "/frame/website", icon: Globe, color: "text-cyan-500 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-500/10" },
    { label: "Social", href: "/feel/social", icon: Share2, color: "text-pink-500 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-500/10" },
    { label: "Learn", href: "/frame/learn", icon: GraduationCap, color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10" },
];

export default function AppLauncher() {
    return (
        <div className="mt-6 mb-8 mx-4 relative z-10">
            <h2 className="px-2 text-lg font-bold text-neutral-900 dark:text-white tracking-tight transition-colors mb-4">Your Workspace</h2>

            <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-x-4">
                <div className="w-2 shrink-0" /> {/* Left Spacer */}
                {APPS.map((app) => (
                    <Link
                        key={app.label}
                        href={app.href}
                        className="flex flex-col items-center gap-2 group snap-start w-[60px] shrink-0"
                    >
                        <div className={clsx(
                            "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-105 group-active:scale-95",
                            app.bg
                        )}>
                            <app.icon className={clsx("w-6 h-6", app.color)} strokeWidth={2} />
                        </div>
                        <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 text-center leading-tight group-hover:text-neutral-900 dark:group-hover:text-white transition-colors line-clamp-1">
                            {app.label}
                        </span>
                    </Link>
                ))}
                <div className="w-2 shrink-0" /> {/* Right Spacer */}
            </div>
        </div>
    );
}
