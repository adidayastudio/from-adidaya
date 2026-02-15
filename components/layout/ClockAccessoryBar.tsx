"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Clock, Play, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useClock } from "@/hooks/useClock";
import useUserProfile from "@/hooks/useUserProfile";
import ClockActionModal from "@/components/feel/clock/ClockActionModal";

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
        elapsed,
        toggleClock,
        formatTime,
        loading: clockLoading,
    } = useClock();
    const [isClockModalOpen, setIsClockModalOpen] = useState(false);

    const isDashboard = pathname === "/dashboard" || pathname === "/dashboard/";

    return (
        <>
            {/* Static outer — mirrors MobileBottomBarV2 positioning exactly */}
            {isDashboard && (
                <div
                    className="lg:hidden fixed bottom-[100px] left-1/2 -translate-x-1/2 z-40 w-full px-4 max-w-lg"
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
                                className="relative overflow-hidden rounded-full flex items-center p-2.5 w-full"
                                style={{
                                    background:
                                        "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)",
                                    backdropFilter: "blur(40px) saturate(200%)",
                                    WebkitBackdropFilter: "blur(40px) saturate(200%)",
                                    border: "1px solid rgba(255,255,255,0.3)",
                                    boxShadow:
                                        "0 8px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.4)",
                                }}
                            >
                                {/* Glass specular highlight */}
                                <div
                                    className="absolute inset-0 rounded-full pointer-events-none"
                                    style={{
                                        background:
                                            "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)",
                                    }}
                                />

                                {clockLoading ? (
                                    <div className="flex-1 flex items-center gap-3 animate-pulse relative z-10">
                                        <div className="w-[40px] h-[40px] rounded-full bg-neutral-200/40" />
                                        <div className="space-y-1.5">
                                            <div className="w-10 h-2 bg-neutral-200/40 rounded-full" />
                                            <div className="w-16 h-4 bg-neutral-200/40 rounded-full" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center gap-3 relative z-10">
                                        <motion.div
                                            whileTap={{ scale: 0.85 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                            className={clsx(
                                                "w-[40px] h-[40px] rounded-full flex items-center justify-center",
                                                isCheckedIn ? "text-blue-600" : "text-neutral-400"
                                            )}
                                            style={{
                                                background: isCheckedIn
                                                    ? "linear-gradient(135deg, rgba(191,219,254,0.7) 0%, rgba(147,197,253,0.4) 100%)"
                                                    : "linear-gradient(135deg, rgba(229,231,235,0.6) 0%, rgba(209,213,219,0.3) 100%)",
                                                border: isCheckedIn
                                                    ? "1px solid rgba(147,197,253,0.4)"
                                                    : "1px solid rgba(209,213,219,0.3)",
                                                backdropFilter: "blur(12px)",
                                                WebkitBackdropFilter: "blur(12px)",
                                            }}
                                        >
                                            <Clock className="w-[18px] h-[18px]" strokeWidth={1.5} />
                                        </motion.div>
                                        <div>
                                            <div className="text-[9px] font-semibold text-neutral-400 uppercase tracking-[0.12em] leading-none mb-0.5">
                                                {isCheckedIn ? "On Duty" : "Offline"}
                                            </div>
                                            <div
                                                className={clsx(
                                                    "text-lg font-bold tracking-tighter tabular-nums leading-none",
                                                    isCheckedIn ? "text-neutral-800" : "text-neutral-300"
                                                )}
                                            >
                                                {isCheckedIn ? formatTime(elapsed) : "00:00:00"}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Clock In/Out Button — translucent Apple liquid glass style */}
                                <motion.button
                                    whileTap={{ scale: 0.88, rotate: isCheckedIn ? 2 : -2 }}
                                    whileHover={{ scale: 1.04 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 500,
                                        damping: 15,
                                        mass: 0.6,
                                    }}
                                    onClick={() => setIsClockModalOpen(true)}
                                    disabled={clockLoading}
                                    className={clsx(
                                        "relative z-10 flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold",
                                        clockLoading ? "opacity-50 cursor-not-allowed" : ""
                                    )}
                                    style={
                                        clockLoading
                                            ? {
                                                background: "rgba(229,231,235,0.5)",
                                                color: "#9ca3af",
                                            }
                                            : isCheckedIn
                                                ? {
                                                    background:
                                                        "linear-gradient(180deg, rgba(252,165,165,0.6) 0%, rgba(239,68,68,0.7) 50%, rgba(220,38,38,0.65) 100%)",
                                                    color: "#ffffff",
                                                    border: "1px solid rgba(252,165,165,0.5)",
                                                    backdropFilter: "blur(16px) saturate(180%)",
                                                    WebkitBackdropFilter: "blur(16px) saturate(180%)",
                                                    boxShadow:
                                                        "0 4px 20px rgba(239,68,68,0.3), inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(220,38,38,0.2)",
                                                }
                                                : {
                                                    background:
                                                        "linear-gradient(180deg, #3898FF 0%, #0A84FF 40%, #007AFF 100%)",
                                                    color: "#ffffff",
                                                    border: "1px solid rgba(56,152,255,0.3)",
                                                    boxShadow:
                                                        "0 4px 16px rgba(10,132,255,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
                                                }
                                    }
                                >
                                    {clockLoading ? (
                                        <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                    ) : isCheckedIn ? (
                                        <Square className="w-3.5 h-3.5 fill-current" />
                                    ) : (
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                    )}
                                    {isCheckedIn ? "Clock Out" : "Clock In"}
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
