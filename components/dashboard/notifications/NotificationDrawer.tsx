"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BottomSheet from "@/components/shared/BottomSheet";
import { useTheme } from "next-themes";
import NotificationsContent, { NotificationSection } from "@/components/dashboard/notifications/NotificationsContent";
import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

const SEGMENTS: { id: NotificationSection; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "finance", label: "Finance" },
    { id: "crew", label: "Crew" },
    { id: "projects", label: "Projects" },
    { id: "system", label: "System" },
];

interface NotificationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
    const router = useRouter();
    const [section, setSection] = useState<NotificationSection>("all");
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        setMounted(true);
        const checkIsDesktop = () => {
            setIsDesktop(window.innerWidth >= 768);
        };
        checkIsDesktop();
        window.addEventListener('resize', checkIsDesktop);
        return () => window.removeEventListener('resize', checkIsDesktop);
    }, []);

    // Reset to "all" when opening
    React.useEffect(() => {
        if (isOpen) setSection("all");
    }, [isOpen]);

    if (!mounted) return null;

    // --- SIDE DRAWER FOR WEB / IPAD ---
    if (isDesktop) {
        return (
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] isolate">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 bg-neutral-900/30 backdrop-blur-sm"
                            onClick={onClose}
                        />

                        {/* Drawer Panel */}
                        <motion.div
                            initial={{ x: "100%", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: "100%", opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 32 }}
                            className={clsx(
                                "absolute z-50 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl border border-white/60 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col",
                                "top-6 bottom-6 right-6 w-[500px] rounded-[56px]"
                            )}
                        >
                            {/* Sticky Header */}
                            <div className="flex-none px-8 pt-10 pb-4 sticky top-0 z-20 bg-transparent">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-[22px] font-bold text-neutral-900 dark:text-white tracking-tight">
                                        Notifications
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                onClose();
                                                router.push("/dashboard/notifications");
                                            }}
                                            className="h-[32px] px-4 flex items-center gap-1.5 rounded-full text-[11px] font-bold text-neutral-500 dark:text-neutral-300 bg-neutral-100/80 dark:bg-white/10 border border-neutral-200/50 dark:border-white/10 hover:bg-neutral-200/80 dark:hover:bg-white/20 transition-colors"
                                        >
                                            History
                                        </button>
                                    </div>
                                </div>

                                {/* Segmented Control */}
                                <div
                                    className="flex rounded-full p-1 relative"
                                    style={{
                                        background: "rgba(118, 118, 128, 0.08)",
                                        backdropFilter: "blur(10px)",
                                        WebkitBackdropFilter: "blur(10px)",
                                    }}
                                >
                                    {SEGMENTS.map((seg) => {
                                        const isActive = section === seg.id;
                                        return (
                                            <button
                                                key={seg.id}
                                                onClick={() => setSection(seg.id)}
                                                className="flex-1 relative z-10 py-1.5 text-[13px] font-semibold transition-colors duration-200"
                                                style={{
                                                    color: isActive
                                                        ? (theme !== 'dark' ? "#000" : "#fff")
                                                        : (theme !== 'dark' ? "rgba(60,60,67,0.6)" : "rgba(255,255,255,0.6)"),
                                                }}
                                            >
                                                {seg.label}
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeSegmentDesktop"
                                                        className="absolute inset-0 rounded-full -z-10"
                                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                                        style={{
                                                            background: theme !== 'dark' ? "#fff" : "#333",
                                                            boxShadow: theme !== 'dark'
                                                                ? "0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)"
                                                                : "0 2px 8px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
                                                        }}
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto px-8 py-4 scrollbar-hide">
                                <NotificationsContent section={section} isEmbedded />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        );
    }

    // --- BOTTOM SHEET FOR MOBILE ---
    return (
        <BottomSheet isOpen={isOpen} onClose={onClose}>
            {/* iOS Segmented Control - Liquid Glass */}
            <div className="px-5 pt-6 pb-3">
                <div className="flex items-center justify-between mb-5 px-1">
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">Notifications</h2>

                    {/* Header Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                onClose();
                                router.push("/dashboard/notifications");
                            }}
                            className="h-[28px] px-4 flex items-center gap-1 rounded-full text-[10px] font-bold text-neutral-500 dark:text-neutral-300 bg-neutral-100/80 dark:bg-white/10 border border-neutral-200/50 dark:border-white/10 hover:bg-neutral-200/80 dark:hover:bg-white/20 transition-colors"
                        >
                            History
                        </button>
                    </div>
                </div>

                <div className="px-0">
                    <div
                        className="flex rounded-full p-1 relative"
                        style={{
                            background: "rgba(118, 118, 128, 0.08)",
                            backdropFilter: "blur(10px)",
                            WebkitBackdropFilter: "blur(10px)",
                        }}
                    >
                        {SEGMENTS.map((seg) => {
                            const isActive = section === seg.id;
                            return (
                                <button
                                    key={seg.id}
                                    onClick={() => setSection(seg.id)}
                                    className="flex-1 relative z-10 py-1.5 text-[13px] font-semibold transition-colors duration-200"
                                    style={{
                                        color: isActive
                                            ? (theme !== 'dark' ? "#000" : "#fff")
                                            : (theme !== 'dark' ? "rgba(60,60,67,0.6)" : "rgba(255,255,255,0.6)"),
                                    }}
                                >
                                    {seg.label}
                                    {/* Active pill background with Layout Animation */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeSegment"
                                            className="absolute inset-0 rounded-full -z-10"
                                            transition={{
                                                type: "spring",
                                                stiffness: 350,
                                                damping: 30,
                                            }}
                                            style={{
                                                background: theme !== 'dark' ? "#fff" : "#333",
                                                boxShadow: theme !== 'dark'
                                                    ? "0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)"
                                                    : "0 2px 8px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
                                            }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Notification Content - Hide mobile header since we have drawer header */}
            <div className="p-4">
                <NotificationsContent section={section} isEmbedded />
            </div>

        </BottomSheet>
    );
}
