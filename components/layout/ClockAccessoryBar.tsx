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
        clockInLat,
        clockInLng,
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
    const [showStatusTooltip, setShowStatusTooltip] = useState(false);

    const statusLabel = status === "on-time" ? "You're On Time"
        : status === "intime" ? "You're In Time"
            : status === "late" ? "You're Late"
                : status === "overtime" ? "You're in Overtime" : "";

    const handleClockIconTap = () => {
        if (!isCheckedIn) return;
        setShowStatusTooltip(true);
        setTimeout(() => setShowStatusTooltip(false), 2000);
    };

    const mapsUrl = clockInLat && clockInLng
        ? `https://www.google.com/maps?q=${clockInLat},${clockInLng}`
        : null;

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
                                className="relative rounded-[32px] flex items-center p-2 w-full h-[64px] transition-colors shadow-lg"
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
                                    className="absolute inset-0 rounded-[32px] pointer-events-none transition-colors"
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
                                    <div className="flex-1 flex items-center justify-between gap-3 relative z-10">
                                        {/* Left Column: Clock Icon + Timer */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <motion.div
                                                whileTap={{ scale: 0.9 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                                className={clsx(
                                                    "w-[44px] h-[44px] rounded-full flex items-center justify-center transition-colors shadow-sm shrink-0 relative",
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
                                                onClick={handleClockIconTap}
                                            >
                                                <Clock className="w-[18px] h-[18px]" strokeWidth={2.5} />
                                                {/* Status Tooltip */}
                                                <AnimatePresence>
                                                    {showStatusTooltip && statusLabel && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 8, scale: 0.9 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                                            transition={{ duration: 0.15 }}
                                                            className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] font-medium shadow-xl z-50"
                                                            style={{
                                                                background: isDark ? "rgba(30,30,30,0.6)" : "rgba(255,255,255,0.6)",
                                                                color: isDark ? "#fff" : "#111",
                                                                border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.8)",
                                                                backdropFilter: "blur(24px) saturate(200%)",
                                                                WebkitBackdropFilter: "blur(24px) saturate(200%)",
                                                            }}
                                                        >
                                                            {statusLabel}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>

                                            <div
                                                className={clsx(
                                                    "text-[22px] font-bold tracking-tighter tabular-nums leading-none transition-colors font-mono",
                                                    isCheckedIn ? (isDark ? "text-white" : "text-neutral-900") : (isDark ? "text-neutral-500" : "text-neutral-300")
                                                )}
                                            >
                                                {isCheckedIn ? formatTime(elapsed) : "00:00:00"}
                                            </div>
                                        </div>

                                        {/* Middle Column: Location + Info (Only when checked in) */}
                                        {isCheckedIn && (
                                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 border-l-2 border-neutral-300/40 dark:border-neutral-700/60 pl-3 ml-1 h-[40px]">
                                                {/* Row 1: Location */}
                                                {(locationCode || remoteMode) && (
                                                    mapsUrl ? (
                                                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 active:opacity-60 transition-opacity whitespace-nowrap overflow-hidden">
                                                            <MapPin className="w-3 h-3 shrink-0 text-neutral-400 dark:text-neutral-500" />
                                                            <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase truncate">
                                                                {locationCode ||
                                                                    (remoteMode === "business_trip" ? "BST" :
                                                                        remoteMode === "other" ? "OTH" :
                                                                            remoteMode)}
                                                            </span>
                                                        </a>
                                                    ) : (
                                                        <div className="flex items-center gap-1 whitespace-nowrap overflow-hidden">
                                                            <MapPin className="w-3 h-3 shrink-0 text-neutral-400 dark:text-neutral-500" />
                                                            <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase truncate">
                                                                {locationCode ||
                                                                    (remoteMode === "business_trip" ? "BST" :
                                                                        remoteMode === "other" ? "OTH" :
                                                                            remoteMode)}
                                                            </span>
                                                        </div>
                                                    )
                                                )}

                                                {/* Row 2: Start/Target Info */}
                                                <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
                                                    <div className="flex items-center gap-0.5">
                                                        <ArrowUpRight className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                                        <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 tabular-nums">
                                                            {formatShortTime(startTime)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-0.5">
                                                        <ArrowDownRight className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                                                        <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 tabular-nums">
                                                            {formatShortTime(targetTime)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Right Column: Clock In/Out Button */}
                                        <div className="shrink-0 flex items-center">
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
                                                    "relative z-10 flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-black uppercase tracking-wider h-[46px] shrink-0",
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
                                                                    "0 4px 14px rgba(255,59,48,0.3), inset 0 1px 0 rgba(255,255,255,0.25)",
                                                            }
                                                            : {
                                                                background:
                                                                    "linear-gradient(180deg, #3898FF 0%, #0A84FF 40%, #007AFF 100%)",
                                                                color: "#ffffff",
                                                                border: "1px solid rgba(56,152,255,0.3)",
                                                                boxShadow:
                                                                    "0 4px 14px rgba(10,132,255,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
                                                            }
                                                }
                                            >
                                                {clockLoading ? (
                                                    <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                                ) : isCheckedIn ? (
                                                    <Square className="w-3.5 h-3.5 fill-current mb-[-1px]" strokeWidth={0} />
                                                ) : (
                                                    <Play className="w-4 h-4 fill-current ml-0.5" strokeWidth={0} />
                                                )}
                                                {isCheckedIn ? "OUT" : "IN"}
                                            </motion.button>
                                        </div>
                                    </div>
                                )}
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
