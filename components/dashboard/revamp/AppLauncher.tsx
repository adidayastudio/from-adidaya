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
} from "lucide-react";

const APPS = [
    { label: "Projects", href: "/flow/projects", icon: FolderKanban },
    { label: "Finance", href: "/flow/finance", icon: Banknote },
    { label: "Tracking", href: "/flow/tracking", icon: Activity },
    { label: "People", href: "/feel/people", icon: Users },
    { label: "Clock", href: "/feel/clock", icon: Clock },
    { label: "Crew", href: "/feel/crew", icon: HardHat },
    { label: "Website", href: "/frame/website", icon: Globe },
    { label: "Social", href: "/frame/social", icon: Share2 },
    { label: "Learn", href: "/frame/learn", icon: GraduationCap },
];

export default function AppLauncher() {
    return (
        <div className="mt-2 mb-8 relative z-10">
            <div className="flex items-center justify-between px-1 mb-4">
                <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Your Workspace</h2>
            </div>

            <div className="w-full overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                <div className="flex gap-4 w-max p-1">
                    {APPS.map((app) => (
                        <Link
                            key={app.label}
                            href={app.href}
                            className="flex flex-col items-center gap-3 w-[72px] group"
                        >
                            <div className="w-[72px] h-[72px] rounded-[24px] flex items-center justify-center border border-white/60 bg-white/40 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.1)] backdrop-blur-xl transition-all duration-300 ease-out group-hover:scale-110 group-active:scale-90 group-hover:shadow-lg group-hover:bg-white/60">
                                <app.icon className="w-8 h-8 text-neutral-500 drop-shadow-sm transition-colors group-hover:text-neutral-800" strokeWidth={1.5} />
                            </div>
                            <span className="text-[11px] font-medium text-neutral-500 text-center leading-tight group-hover:text-neutral-900 transition-colors">
                                {app.label}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
