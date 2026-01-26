"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
    Home,
    Layers,
    Workflow,
    Heart,
    Play,
    Square,
    Plus
} from "lucide-react";
import { useClock } from "@/hooks/useClock";
import useUserProfile from "@/hooks/useUserProfile";
import ClockActionModal from "@/components/feel/clock/ClockActionModal";

const MOBILE_NAV_ITEMS = [
    { id: "home", label: "Home", icon: Home, href: "/dashboard" },
    { id: "frame", label: "Frame", icon: Layers, href: "/frame" },
    { id: "flow", label: "Flow", icon: Workflow, href: "/flow" },
    { id: "feel", label: "Feel", icon: Heart, href: "/feel" },
];

export default function MobileBottomBar() {
    const pathname = usePathname();
    const { isCheckedIn, toggleClock } = useClock();
    const { profile } = useUserProfile();
    const [isClockModalOpen, setIsClockModalOpen] = React.useState(false);

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard";
        return pathname.startsWith(href);
    };

    // Determine FAB context
    const isDashboard = pathname === "/dashboard" || pathname === "/dashboard/overview";

    const handleFabClick = () => {
        if (isDashboard) {
            setIsClockModalOpen(true);
        } else {
            // Default action for other pages or can be customized per-path
            console.log("FAB Clicked on", pathname);
        }
    };

    return (
        <>
            <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 w-full px-4 max-w-sm">
                {/* iOS 26 GLASS NAV BAR */}
                <div
                    className="flex-1 backdrop-blur-2xl border border-white/50 shadow-2xl shadow-black/10 rounded-full px-2 py-1.5 flex justify-between items-center"
                    style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(250,250,252,0.75) 100%)' }}
                >
                    {MOBILE_NAV_ITEMS.map((item) => {
                        const active = isActive(item.href);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={clsx(
                                    "relative flex flex-col items-center justify-center transition-all duration-200 rounded-full p-3",
                                    active
                                        ? "text-neutral-800"
                                        : "text-neutral-400 active:text-neutral-600"
                                )}
                            >
                                {active && (
                                    <div
                                        className="absolute inset-0 rounded-full border border-white/60"
                                        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(245,245,247,0.8) 100%)' }}
                                    />
                                )}
                                <Icon
                                    className="w-5 h-5 transition-colors relative z-10"
                                    strokeWidth={active ? 2.5 : 2}
                                />
                            </Link>
                        );
                    })}
                </div>

                {/* iOS 26 GLASS FAB */}
                <button
                    onClick={handleFabClick}
                    className={clsx(
                        "w-14 h-14 flex items-center justify-center rounded-full shadow-xl transition-all active:scale-95 flex-shrink-0 text-white border border-white/20",
                        isDashboard
                            ? (isCheckedIn
                                ? "shadow-red-500/30"
                                : "shadow-blue-500/40")
                            : "shadow-neutral-400/30"
                    )}
                    style={{
                        background: isDashboard
                            ? (isCheckedIn
                                ? 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)'
                                : 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)')
                            : 'linear-gradient(180deg, #404040 0%, #171717 100%)'
                    }}
                >
                    {isDashboard ? (
                        isCheckedIn ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />
                    ) : (
                        <Plus className="w-6 h-6" />
                    )}
                </button>
            </div>

            <ClockActionModal
                isOpen={isClockModalOpen}
                onClose={() => setIsClockModalOpen(false)}
                type={isCheckedIn ? "OUT" : "IN"}
                userRole={profile?.role || "staff"}
                onConfirm={toggleClock}
            />
        </>
    );
}
