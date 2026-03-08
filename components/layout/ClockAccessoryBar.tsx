"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Clock, Play, Square, ArrowUpRight, ArrowDownRight, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useClock } from "@/hooks/useClock";
import useUserProfile from "@/hooks/useUserProfile";
import ClockActionModal from "@/components/feel/clock/ClockActionModal";
import { useTheme } from "next-themes";

/**
 * Floating Clock Accessory Bar — sits above the bottom tab bar.
 * Only visible on the /dashboard route (mobile only).
 * iOS 26 Liquid Glass aesthetic with bouncy spring interactions.
 */
export default function ClockAccessoryBar() {
    const pathname = usePathname();
    const { profile } = useUserProfile();
    const {
        isCheckedIn,
        startTime,
        locationCode,
        remoteMode,
        targetTime,
        elapsed,
        toggleClock,
        formatTime,
        status,
        loading: clockLoading,
    } = useClock();
    const [isClockModalOpen, setIsClockModalOpen] = useState(false);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const isDashboard = pathname === "/dashboard" || pathname === "/dashboard/";
    const isDark = mounted && resolvedTheme === "dark";

    const formatShortTime = (date: Date | null) => {
        if (!date) return "--:--";
        return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <>
            {/* Static outer — mirrors MobileBottomBarV2 positioning exactly */}
            {isDashboard && (
                <div
                    className="lg:hidden fixed bottom-[96px] left-1/2 -translate-x-1/2 z-40 w-full px-4 max-w-lg"
                    style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                >
                    <AnimatePresence>
                        <motion.div
                            key="clock-accessory"
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 24, mass: 0.8 }}
                        >
                            <div
                                className="relative overflow-hidden rounded-[2.5rem] flex items-center p-2 w-full transition-colors"
                                style={{
                                    background: isDark
                                        ? "linear-gradient(180deg, rgba(40,40,40,0.65) 0%, rgba(20,20,20,0.45) 100%)"
                                        : "linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(240,240,245,0.4) 100%)",
                                    backdropFilter: "blur(48px) saturate(220%)",
                                    WebkitBackdropFilter: "blur(48px) saturate(220%)",
                                    border: isDark
                                        ? "1px solid rgba(255,255,255,0.08)"
                                        : "1px solid rgba(255,255,255,0.6)",
                                    boxShadow: isDark
                                        ? "0 12px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05)"
                                        : "0 12px 40px rgba(0,0,0,0.08), inset 0 1px 0.5px rgba(255,255,255,0.8)",
                                }}
                            >
                                {/* Glass specular highlight */}
                                <div
                                    className="absolute inset-0 rounded-[2.5rem] pointer-events-none transition-colors"
                                    style={{
                                        background: isDark
                                            ? "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%, rgba(255,255,255,0.01) 100%)"
                                            : "linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 60%, rgba(255,255,255,0.2) 100%)",
                                    }}
                                />

                                {clockLoading ? (
                                    <div className="flex-1 flex items-center gap-3 animate-pulse relative z-10 px-2">
                                        <div className="w-[42px] h-[42px] rounded-full bg-neutral-200/40" />
                                        <div className="space-y-1.5 flex-1">
                                            <div className="w-12 h-2 bg-neutral-200/40 rounded-full" />
                                            <div className="w-24 h-4 bg-neutral-200/40 rounded-full" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-between gap-2 relative z-10 px-1">
                                        <div className="flex items-center gap-2.5">
                                            <motion.div
                                                whileTap={{ scale: 0.9 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                                className={clsx(
                                                    "w-[44px] h-[44px] rounded-full flex items-center justify-center transition-colors shadow-sm",
                                                    !isCheckedIn && (isDark ? "text-neutral-400" : "text-neutral-400"),
                                                    isCheckedIn && status === "on-time" && (isDark ? "text-emerald-200" : "text-emerald-600"),
                                                    isCheckedIn && status === "intime" && (isDark ? "text-amber-200" : "text-amber-600"),
                                                    isCheckedIn && status === "late" && (isDark ? "text-red-200" : "text-red-600"),
                                                    isCheckedIn && status === "overtime" && (isDark ? "text-violet-200" : "text-violet-600"),
                                                )}
                                                style={{
                                                    background: isCheckedIn
                                                        ? status === "on-time"
                                                            ? isDark
                                                                ? "linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(5,150,105,0.1) 100%)"
                                                                : "linear-gradient(135deg, rgba(209,250,229,0.8) 0%, rgba(167,243,208,0.5) 100%)"
                                                            : status === "intime"
                                                                ? isDark
                                                                    ? "linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(217,119,6,0.1) 100%)"
                                                                    : "linear-gradient(135deg, rgba(254,243,199,0.8) 0%, rgba(253,230,138,0.5) 100%)"
                                                                : status === "late"
                                                                    ? isDark
                                                                        ? "linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(220,38,38,0.1) 100%)"
                                                                        : "linear-gradient(135deg, rgba(254,226,226,0.8) 0%, rgba(254,202,202,0.5) 100%)"
                                                                    : status === "overtime"
                                                                        ? isDark
                                                                            ? "linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(109,40,217,0.1) 100%)"
                                                                            : "linear-gradient(135deg, rgba(237,233,254,0.8) 0%, rgba(221,214,254,0.5) 100%)"
                                                                        : isDark
                                                                            ? "linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(37,99,235,0.1) 100%)"
                                                                            : "linear-gradient(135deg, rgba(219,234,254,0.8) 0%, rgba(191,219,254,0.5) 100%)"
                                                        : isDark
                                                            ? "linear-gradient(135deg, rgba(60,60,60,0.4) 0%, rgba(40,40,40,0.2) 100%)"
                                                            : "linear-gradient(135deg, rgba(243,244,246,0.8) 0%, rgba(229,231,235,0.4) 100%)",
                                                    border: isCheckedIn
                                                        ? status === "on-time"
                                                            ? isDark ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(110,231,183,0.5)"
                                                            : status === "intime"
                                                                ? isDark ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(252,211,77,0.5)"
                                                                : status === "late"
                                                                    ? isDark ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(252,165,165,0.5)"
                                                                    : status === "overtime"
                                                                        ? isDark ? "1px solid rgba(139,92,246,0.2)" : "1px solid rgba(196,181,253,0.5)"
                                                                        : isDark ? "1px solid rgba(59,130,246,0.2)" : "1px solid rgba(147,197,253,0.5)"
                                                        : isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(209,213,219,0.4)",
                                                }}
                                            >
                                                <Clock className="w-[18px] h-[18px]" strokeWidth={2} />
                                            </motion.div>

                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className={clsx(
                                                        "text-[9px] font-bold uppercase tracking-[0.14em] leading-none",
                                                        isCheckedIn ? (isDark ? "text-blue-400" : "text-blue-600") : "text-neutral-400 dark:text-neutral-500"
                                                    )}>
                                                        {isCheckedIn ? "On Duty" : "Offline"}
                                                    </span>
                                                    {isCheckedIn && (locationCode || remoteMode) && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-[1px] h-2.5 bg-neutral-200 dark:bg-neutral-800" />
                                                            <div className="flex items-center gap-1">
                                                                <MapPin className="w-[9px] h-[9px] text-blue-500 dark:text-blue-400" />
                                                                <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                                                                    {locationCode ||
                                                                        (remoteMode === "business_trip" ? "BST" :
                                                                            remoteMode === "other" ? "OTH" :
                                                                                remoteMode)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div
                                                    className={clsx(
                                                        "text-[19px] font-bold tracking-tight tabular-nums leading-none transition-colors font-mono",
                                                        isCheckedIn ? (isDark ? "text-white" : "text-neutral-900") : (isDark ? "text-neutral-500" : "text-neutral-300")
                                                    )}
                                                >
                                                    {isCheckedIn ? formatTime(elapsed) : "00:00:00"}
                                                </div>
                                            </div>
                                        </div>

                                        {isCheckedIn && (
                                            <div className="flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-white/40 dark:bg-black/20 border border-white/50 dark:border-white/5 mx-1">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <div className="flex items-center gap-1 text-[8px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tighter">
                                                        <ArrowUpRight className="w-2.5 h-2.5" />
                                                        <span>Start</span>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 tabular-nums">
                                                        {formatShortTime(startTime)}
                                                    </span>
                                                </div>
                                                <div className="w-[1px] h-6 bg-neutral-200 dark:bg-neutral-800" />
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <div className="flex items-center gap-1 text-[8px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tighter">
                                                        <ArrowDownRight className="w-2.5 h-2.5" />
                                                        <span>Target</span>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 tabular-nums">
                                                        {formatShortTime(targetTime)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Clock In/Out Button — translucent Apple liquid glass style */}
                                <motion.button
                                    whileTap={{ scale: 0.92 }}
                                    whileHover={{ scale: 1.02 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 500,
                                        damping: 18,
                                        mass: 0.6,
                                    }}
                                    onClick={() => setIsClockModalOpen(true)}
                                    disabled={clockLoading}
                                    className={clsx(
                                        "relative z-10 flex items-center gap-2 px-5 py-3 rounded-full text-[11px] font-black uppercase tracking-wider h-[46px]",
                                        clockLoading ? "opacity-50 cursor-not-allowed" : ""
                                    )}
                                    style={
                                        clockLoading
                                            ? {
                                                background: isDark ? "rgba(60,60,60,0.5)" : "rgba(229,231,235,0.5)",
                                                color: isDark ? "#6b7280" : "#9ca3af",
                                                border: isDark ? "1px solid rgba(255,255,255,0.02)" : "none",
                                            }
                                            : isCheckedIn
                                                ? {
                                                    background:
                                                        "linear-gradient(180deg, #FF5E5E 0%, #FF3B30 100%)",
                                                    color: "#ffffff",
                                                    border: "1px solid rgba(255,100,100,0.3)",
                                                    boxShadow:
                                                        "0 6px 20px rgba(255,59,48,0.3), inset 0 1px 0 rgba(255,255,255,0.25)",
                                                }
                                                : {
                                                    background:
                                                        "linear-gradient(180deg, #3898FF 0%, #0A84FF 40%, #007AFF 100%)",
                                                    color: "#ffffff",
                                                    border: "1px solid rgba(56,152,255,0.3)",
                                                    boxShadow:
                                                        "0 6px 18px rgba(10,132,255,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
                                                }
                                    }
                                >
                                    {clockLoading ? (
                                        <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                    ) : isCheckedIn ? (
                                        <Square className="w-3 h-3 fill-current" strokeWidth={0} />
                                    ) : (
                                        <Play className="w-3 h-3 fill-current" strokeWidth={0} />
                                    )}
                                    {isCheckedIn ? "Out" : "Clock In"}
                                </motion.button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}

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
