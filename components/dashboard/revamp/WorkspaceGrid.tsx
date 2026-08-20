"use client";

import Link from "next/link";
import { CreditCard, Package, User, Clock, Users, Compass, MessageCircle, BookOpen, FileText, Zap } from "lucide-react";
import clsx from "clsx";

const APPS = [
    { label: "Stream", href: "/stream", icon: Zap, color: "from-blue-600/40 to-blue-600/20 dark:from-blue-600/30 dark:to-neutral-900", iconColor: "text-blue-500", border: "border-blue-500/30 dark:border-blue-500/40" },
    { label: "Finance", href: "/flow/finance", icon: CreditCard, color: "from-red-500/40 to-red-500/20 dark:from-red-500/30 dark:to-neutral-900", iconColor: "text-red-500", border: "border-red-500/20 dark:border-red-500/30" },
    { label: "Resources", href: "/flow/resources", icon: Package, color: "from-orange-500/40 to-orange-500/20 dark:from-orange-500/30 dark:to-neutral-900", iconColor: "text-orange-500", border: "border-orange-500/20 dark:border-orange-500/30" },
    { label: "Reports", href: "/flow/reports", icon: FileText, color: "from-blue-500/40 to-blue-500/20 dark:from-blue-500/30 dark:to-neutral-900", iconColor: "text-blue-500", border: "border-blue-500/20 dark:border-blue-500/30" },
    { label: "People", href: "/feel/people", icon: User, color: "from-green-500/40 to-green-500/20 dark:from-green-500/30 dark:to-neutral-900", iconColor: "text-green-500", border: "border-green-500/20 dark:border-green-500/30" },
    { label: "Clock", href: "/feel/clock", icon: Clock, color: "from-sky-500/40 to-sky-500/20 dark:from-sky-500/30 dark:to-neutral-900", iconColor: "text-sky-500", border: "border-sky-500/20 dark:border-sky-500/30" },
    { label: "Crew", href: "/feel/crew", icon: Users, color: "from-purple-500/40 to-purple-500/20 dark:from-purple-500/30 dark:to-neutral-900", iconColor: "text-purple-500", border: "border-purple-500/20 dark:border-purple-500/30" },
    // { label: "Website", href: "/frame/website", icon: Compass, color: "from-teal-500/40 to-teal-500/20 dark:from-teal-500/30 dark:to-neutral-900", iconColor: "text-teal-500", border: "border-teal-500/20 dark:border-teal-500/30" },
    // { label: "Social", href: "/frame/social", icon: MessageCircle, color: "from-yellow-500/40 to-yellow-500/20 dark:from-yellow-500/30 dark:to-neutral-900", iconColor: "text-yellow-500", border: "border-yellow-500/20 dark:border-yellow-500/30" },
    // { label: "Learn", href: "/frame/learn", icon: BookOpen, color: "from-blue-500/40 to-blue-500/20 dark:from-blue-500/30 dark:to-neutral-900", iconColor: "text-blue-500", border: "border-blue-500/20 dark:border-blue-500/30" },
];

export default function WorkspaceGrid() {
    return (
        <div className="mt-8 relative z-10 w-full">
            <h2 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em] mb-4 px-1">
                Workspace
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {APPS.map((app) => (
                    <Link
                        key={app.label}
                        href={app.href}
                        className={clsx(
                            "relative overflow-hidden rounded-[24px] h-[100px] p-4 flex flex-col justify-end transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.96] shadow-sm border backdrop-blur-md",
                            "bg-gradient-to-br",
                            app.color,
                            app.border
                        )}
                    >
                        <span className="text-neutral-900 dark:text-white font-bold text-[15px] relative z-10 tracking-tight">
                            {app.label}
                        </span>

                        {/* Large faded icon at the top right */}
                        <div className={clsx("absolute top-2 right-2 pointer-events-none transform scale-110 opacity-30 dark:opacity-20 transition-transform group-hover:scale-125", app.iconColor)}>
                            <app.icon className="w-12 h-12" strokeWidth={2} />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
