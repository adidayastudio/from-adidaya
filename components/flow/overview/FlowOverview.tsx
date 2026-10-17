"use client";

import React from "react";
import Link from "next/link";
import { FolderKanban, Banknote, Target } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Smart Insights for Flow
const useSmartInsights = () => {
    return {
        projects: "8 Active · 2 Risk",
        finance: "Budget OK · +12%",
        tracking: "Low Stock: Cement",
    };
};

const menuItems = [
    {
        label: "Projects",
        href: "/flow/projects",
        icon: FolderKanban,
        color: "text-red-500", // Red base for Flow
        bg: "bg-red-500/10",
        desc: "Task Boards"
    },
    {
        label: "Finance",
        href: "/flow/finance",
        icon: Banknote,
        color: "text-emerald-500", // Greenish for money diff
        bg: "bg-emerald-500/10",
        desc: "Cashflow"
    },
    {
        label: "Tracking",
        href: "/flow/resources",
        icon: Target,
        color: "text-orange-500",
        bg: "bg-orange-500/10",
        desc: "Inventory"
    }
];

export default function FlowOverview() {
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
                            <h4 className="text-sm font-bold text-slate-800 group-hover:text-red-600 transition-colors truncate">
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
