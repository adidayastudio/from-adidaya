"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import BottomSheet from "@/components/shared/BottomSheet";
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

    // Reset to "all" when opening
    React.useEffect(() => {
        if (isOpen) setSection("all");
    }, [isOpen]);

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose}>
            {/* iOS Segmented Control - Liquid Glass */}
            <div className="px-5 pt-6 pb-3">
                <div className="flex items-center justify-between mb-5 px-1">
                    <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Notifications</h2>

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
                            className="h-[32px] px-3 rounded-full text-[11px] font-bold text-neutral-500 bg-neutral-100/80 border border-neutral-200/50 hover:bg-neutral-200/80 transition-colors"
                        >
                            Test
                        </button>
                        <button
                            onClick={() => {
                                if (confirm("Reload connection?")) {
                                    window.location.reload();
                                }
                            }}
                            className="h-[32px] px-3 rounded-full text-[11px] font-bold text-neutral-500 bg-neutral-100/80 border border-neutral-200/50 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            onClick={() => {
                                onClose();
                                router.push("/dashboard/notifications");
                            }}
                            className="h-[32px] pl-3 pr-2 flex items-center gap-1 rounded-full text-[11px] font-bold text-neutral-500 bg-neutral-100/80 border border-neutral-200/50 hover:bg-neutral-200/80 transition-colors"
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
                                        color: isActive ? "#000" : "rgba(60,60,67,0.6)",
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
                                                background: "#fff",
                                                boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
                                            }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-neutral-200/50 mx-4" />

            {/* Notification Content - Hide mobile header since we have drawer header */}
            <div className="p-4">
                <NotificationsContent section={section} isEmbedded />
            </div>

        </BottomSheet>
    );
}
