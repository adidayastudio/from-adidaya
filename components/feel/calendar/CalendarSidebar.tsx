"use client";

import { Calendar, Plane, Users, Coffee } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

type CalendarSection = "schedule" | "team-events" | "leaves" | "travel";

interface NavItemConfig {
    id: CalendarSection;
    label: string;
    shortLabel: string;
    icon: LucideIcon;
}

const NAV_ITEMS: NavItemConfig[] = [
    { id: "schedule", label: "My Schedule", shortLabel: "Schedule", icon: Calendar },
    { id: "team-events", label: "Team Events", shortLabel: "Events", icon: Users },
    { id: "leaves", label: "Leave Calendar", shortLabel: "Leave", icon: Coffee },
    { id: "travel", label: "Duty Travel", shortLabel: "Travel", icon: Plane },
];

export default function CalendarSidebar() {
    const [activeSection, setActiveSection] = useState<CalendarSection>("schedule");

    return (
        <>
            {/* DESKTOP SIDEBAR */}
            <aside className="w-full h-full hidden md:block">
                <div className="space-y-6 pt-2">
                    <div className="px-1">
                        <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Coordination</h2>
                        <p className="text-[10px] text-neutral-400 mt-1">When people events happen</p>
                    </div>
                    <div className="space-y-1">
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className={clsx(
                                    "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                                    activeSection === item.id
                                        ? "text-blue-600 bg-blue-50"
                                        : "text-neutral-600 hover:bg-neutral-50"
                                )}
                            >
                                <span className={clsx("transition-colors", activeSection === item.id ? "text-blue-600" : "text-neutral-400")}>
                                    <item.icon className="w-4 h-4" />
                                </span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* MOBILE FLOATING TAB BAR - iOS Style */}
            <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
                <div className="mx-auto max-w-fit bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-full px-2 py-1.5">
                    <div className="flex items-center gap-1">
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className={clsx(
                                    "flex flex-col items-center justify-center px-4 py-2 rounded-full transition-all",
                                    activeSection === item.id
                                        ? "bg-blue-500 text-white shadow-lg"
                                        : "text-neutral-500"
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                {activeSection === item.id && (
                                    <span className="text-[9px] font-semibold mt-0.5">{item.shortLabel}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
