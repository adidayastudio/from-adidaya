"use client";

import React from "react";
import Link from "next/link";
import { Globe, Share2, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Smart Insights for Frame
const useSmartInsights = () => {
    return {
        website: "V2 Launch Live",
        social: "IG +15% Reach",
        learn: "5 New Modules",
    };
};

const menuItems = [
    {
        label: "Website",
        href: "/frame/website",
        icon: Globe,
        color: "text-orange-500", // Orange base for Frame
        bg: "bg-orange-500/10",
        desc: "Public Facing"
    },
    {
        label: "Social",
        href: "/frame/social",
        icon: Share2,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        desc: "Channels"
    },
    {
        label: "Learn",
        href: "/frame/learn",
        icon: GraduationCap,
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
        desc: "Academy"
    }
];

export default function FrameOverview() {
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
                        className="group relative flex items-center p-4 rounded-3xl bg-white border border-slate-100 shadow-sm active:scale-[0.98] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md"
                    >
                        {/* Icon Box */}
                        <div className={cn("flex items-center justify-center w-12 h-12 rounded-2xl transition-colors shrink-0", item.bg)}>
                            <item.icon className={cn("w-6 h-6", item.color)} />
                        </div>

                        {/* Text Content */}
                        <div className="ml-4 flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-800 group-hover:text-orange-600 transition-colors truncate">
                                {item.label}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium leading-tight truncate mt-0.5">
                                {item.desc}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
