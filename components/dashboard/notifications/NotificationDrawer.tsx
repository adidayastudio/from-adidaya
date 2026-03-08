"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BottomSheet from "@/components/shared/BottomSheet";
import { useTheme } from "next-themes";
import NotificationsContent, { NotificationSection } from "@/components/dashboard/notifications/NotificationsContent";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const SEGMENTS: { id: NotificationSection; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "finance", label: "Finance" },
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

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset to "all" when opening
    React.useEffect(() => {
        if (isOpen) setSection("all");
    }, [isOpen]);

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
                                // Trigger a test notification securely
                                if ("Notification" in window && Notification.permission === "granted") {
                                    new Notification("Test", { body: "Adidaya Health Check: Push Engine Active" });
                                } else {
                                    alert("Please enable notifications in your browser.");
                                }
                            }}
                            className="h-[28px] px-2.5 rounded-full text-[10px] font-bold text-neutral-500 dark:text-neutral-300 bg-neutral-100/80 dark:bg-white/10 border border-neutral-200/50 dark:border-white/10 hover:bg-neutral-200/80 dark:hover:bg-white/20 transition-colors"
                        >
                            Test
                        </button>
                        <button
                            onClick={() => {
                                if (confirm("Reload connection?")) {
                                    window.location.reload();
                                }
                            }}
                            className="h-[28px] px-2.5 rounded-full text-[10px] font-bold text-neutral-500 dark:text-neutral-300 bg-neutral-100/80 dark:bg-white/10 border border-neutral-200/50 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            onClick={() => {
                                onClose();
                                router.push("/dashboard/notifications");
                            }}
                            className="h-[28px] pl-2.5 pr-2 flex items-center gap-1 rounded-full text-[10px] font-bold text-neutral-500 dark:text-neutral-300 bg-neutral-100/80 dark:bg-white/10 border border-neutral-200/50 dark:border-white/10 hover:bg-neutral-200/80 dark:hover:bg-white/20 transition-colors"
                        >
                            History
                            <ChevronRight className="w-3 h-3" />
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
                                            ? (!mounted || theme !== 'dark' ? "#000" : "#fff")
                                            : (!mounted || theme !== 'dark' ? "rgba(60,60,67,0.6)" : "rgba(255,255,255,0.6)"),
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
                                                background: !mounted || theme !== 'dark' ? "#fff" : "#333",
                                                boxShadow: !mounted || theme !== 'dark'
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

            {/* Divider intentionally removed */}

            {/* Notification Content - Hide mobile header since we have drawer header */}
            <div className="p-4">
                <NotificationsContent section={section} isEmbedded />
            </div>

        </BottomSheet>
    );
}
