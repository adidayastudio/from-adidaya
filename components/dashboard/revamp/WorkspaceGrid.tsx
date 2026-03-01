"use client";

import Link from "next/link";
import { CreditCard, Package, User, Clock, Users, Compass, MessageCircle, BookOpen } from "lucide-react";
import clsx from "clsx";

const APPS = [
    { label: "Finance", href: "/flow/finance", icon: CreditCard, color: "from-[#ef4444] to-[#dc2626]", shadow: "shadow-red-900/20" },
    { label: "Resources", href: "/flow/resources", icon: Package, color: "from-[#f97316] to-[#ea580c]", shadow: "shadow-orange-900/20" },
    { label: "People", href: "/feel/people", icon: User, color: "from-[#22c55e] to-[#16a34a]", shadow: "shadow-green-900/20" },
    { label: "Clock", href: "/feel/clock", icon: Clock, color: "from-[#38bdf8] to-[#0284c7]", shadow: "shadow-sky-900/20" },
    { label: "Crew", href: "/feel/crew", icon: Users, color: "from-[#a855f7] to-[#9333ea]", shadow: "shadow-purple-900/20" },
    { label: "Website", href: "/frame/website", icon: Compass, color: "from-[#14b8a6] to-[#0d9488]", shadow: "shadow-teal-900/20" },
    { label: "Social", href: "/frame/social", icon: MessageCircle, color: "from-[#eab308] to-[#ca8a04]", shadow: "shadow-yellow-900/20" },
    { label: "Learn", href: "/frame/learn", icon: BookOpen, color: "from-[#1e3a8a] to-[#172554]", shadow: "shadow-blue-900/20" },
];

export default function WorkspaceGrid() {
    return (
        <div className="mt-8 mb-32 relative z-10 w-full overflow-hidden">
            <h2 className="px-6 text-[12px] font-bold text-neutral-500 uppercase tracking-widest mb-4">
                Workspace
            </h2>

            {/* Horizontal Scroll Container */}
            <div className="w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-6 pt-2">
                <div className="grid grid-rows-2 grid-flow-col gap-3 px-6 auto-cols-[calc(50vw-24px)] md:auto-cols-[140px]">
                    {APPS.map((app) => (
                        <Link
                            key={app.label}
                            href={app.href}
                            className={clsx(
                                "relative overflow-hidden rounded-[24px] h-[95px] p-4 flex flex-col justify-end transition-transform active:scale-[0.96] shadow-sm snap-start",
                                "bg-gradient-to-br",
                                app.color,
                                app.shadow
                            )}
                        >
                            <span className="text-white font-bold text-[15px] relative z-10 tracking-tight drop-shadow-sm">
                                {app.label}
                            </span>

                            {/* Large faded icon at the top right */}
                            <div className="absolute top-2 right-2 text-white/20 pointer-events-none transform scale-110">
                                <app.icon className="w-12 h-12" strokeWidth={2.5} />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
