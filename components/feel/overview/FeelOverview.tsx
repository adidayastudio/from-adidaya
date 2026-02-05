"use client";

import React from "react";
import Link from "next/link";
import { Users, Clock, Briefcase, HardHat, Sparkles, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock AI Insights Hook
const useSmartInsights = () => {
    // In a real app, this would fetch from an AI summary endpoint
    return {
        people: "12 Active now",
        clock: "On track 40h",
        crew: "Alpha Deployed",
        calendar: "Meeting 14:00",
        career: "3 Goals set",
        culture: "High morale"
    };
};

const menuItems = [
    {
        label: "People",
        href: "/feel/people",
        icon: Users,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        desc: "Directories" // Fallback
    },
    {
        label: "Clock",
        href: "/feel/clock",
        icon: Clock,
        color: "text-cyan-500",
        bg: "bg-cyan-500/10",
        desc: "Attendance"
    },
    {
        label: "Crew",
        href: "/feel/crew",
        icon: HardHat,
        color: "text-indigo-500",
        bg: "bg-indigo-500/10",
        desc: "Field Ops"
    },
    {
        label: "Calendar",
        href: "/feel/calendar",
        icon: Calendar,
        color: "text-violet-500",
        bg: "bg-violet-500/10",
        desc: "Schedules"
    },
    {
        label: "Career",
        href: "/feel/career",
        icon: Briefcase,
        color: "text-pink-500",
        bg: "bg-pink-500/10",
        desc: "Pathways"
    },
    {
        label: "Culture",
        href: "/feel/culture",
        icon: Sparkles,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        desc: "Values"
    }
];

export default function FeelOverview() {
    const insights = useSmartInsights();

    // Merge static config with dynamic insights
    const dynamicItems = menuItems.map(item => {
        const key = item.label.toLowerCase() as keyof typeof insights;
        return {
            ...item,
            desc: insights[key] || item.desc
        };
    });

    return (
        <div className="w-full px-4 pt-0 pb-24">
            <div className="grid grid-cols-2 gap-3">
                {dynamicItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className="group relative flex items-center p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-sm active:scale-[0.98] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md"
                    >
                        {/* Icon Box */}
                        <div className={cn("flex items-center justify-center w-12 h-12 rounded-2xl transition-colors shrink-0", item.bg)}>
                            <item.icon className={cn("w-6 h-6", item.color)} />
                        </div>

                        {/* Text Content */}
                        <div className="ml-4 flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                {item.label}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight truncate mt-0.5">
                                {item.desc}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
