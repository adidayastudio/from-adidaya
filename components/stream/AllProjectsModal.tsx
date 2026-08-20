"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hash } from "lucide-react";
import type { ProjectChannel, SidebarNavMode } from "./StreamSidebar";

interface AllProjectsModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectChannels: ProjectChannel[];
    setNavMode: (mode: SidebarNavMode) => void;
    setSelectedChannelCode: (code: string) => void;
    setActiveChannelSubTab: (tab: "overview" | "chat" | "files" | "activity" | "tracking" | "more") => void;
    setIsChannelHeaderScrolled: (v: boolean) => void;
}

export default function AllProjectsModal({
    isOpen,
    onClose,
    projectChannels,
    setNavMode,
    setSelectedChannelCode,
    setActiveChannelSubTab,
    setIsChannelHeaderScrolled,
}: AllProjectsModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-md flex items-center justify-center p-4"
                >
                    <div className="w-full max-w-lg rounded-[28px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[18px] font-bold text-neutral-900 dark:text-white">
                                All Project Channels ({projectChannels.length})
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto space-y-1">
                            {projectChannels.map((channel) => (
                                <button
                                    key={channel.code}
                                    onClick={() => {
                                        setNavMode("project_channel");
                                        setSelectedChannelCode(channel.code);
                                        setActiveChannelSubTab("chat");
                                        onClose();
                                        setIsChannelHeaderScrolled(false);
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <Hash className="w-4 h-4 text-blue-600" />
                                        <span className="font-mono font-bold text-[13px]">{channel.code}</span>
                                        <span className="text-[13px] text-neutral-600 dark:text-neutral-300 font-medium">
                                            {channel.name}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-neutral-400">{channel.city}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
