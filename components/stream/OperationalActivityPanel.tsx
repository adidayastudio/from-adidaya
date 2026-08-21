"use client";

import React from "react";
import clsx from "clsx";
import { Activity, CreditCard } from "lucide-react";

import StreamFeed from "./StreamFeed";
import StreamDetailPanel from "./StreamDetailPanel";
import PumbleThreadPanel from "./PumbleThreadPanel";
import type { ThreadData } from "./PumbleThreadPanel";
import type { ProjectChannel } from "./StreamSidebar";
import type { SidebarNavMode } from "./StreamSidebar";
import type { FeedItem } from "@/lib/stream/types";

interface OperationalActivityPanelProps {
    activeThreadMessage: ThreadData | null;
    setActiveThreadMessage: React.Dispatch<React.SetStateAction<ThreadData | null>>;
    selectedItem: FeedItem | null;
    setSelectedItem: (item: FeedItem | null) => void;
    currentChannel: ProjectChannel;
    navMode: SidebarNavMode;
    selectedModule?: string;
    feedItems: FeedItem[];
    currentChannelFeed: FeedItem[];
    selectedChannelCode: string;
    isLoadingFeed: boolean;
    loadFeed: () => Promise<void>;
}

export default function OperationalActivityPanel({
    activeThreadMessage,
    setActiveThreadMessage,
    selectedItem,
    setSelectedItem,
    currentChannel,
    navMode,
    selectedModule = "finance",
    feedItems,
    currentChannelFeed,
    selectedChannelCode,
    isLoadingFeed,
    loadFeed,
}: OperationalActivityPanelProps) {
    const isWorkspaceModule = navMode === "workspace_module";
    const targetProjectCode = extractProjectCode(selectedChannelCode, currentChannel?.name || currentChannel?.code);

    const displayFeed = React.useMemo(() => {
        // Mode 1: Module View (Strict Module Taxonomy Filtering)
        if (isWorkspaceModule) {
            return feedItems.filter(item => {
                if (selectedModule === "finance") {
                    return item.parentModule === "finance" || item.type === "expense_logged" || item.entityType === "expense";
                }
                if (selectedModule === "resources") {
                    return item.parentModule === "resources" || item.submodule === "Materials" || item.submodule === "Tools" || item.submodule === "Inventory";
                }
                if (selectedModule === "reports") {
                    return item.parentModule === "reports" || item.type === "progress_updated" || item.submodule === "Daily Report" || item.submodule === "DCR";
                }
                if (selectedModule === "clock") {
                    return item.parentModule === "clock" || item.submodule === "Clock";
                }
                if (selectedModule === "crew") {
                    return item.parentModule === "crew" || item.submodule === "Crew";
                }
                return item.parentModule === selectedModule;
            });
        }

        // Mode 2: Project Channel View (Strict Project Code Filtering, e.g. JPF)
        if (navMode === "project_channel" && targetProjectCode) {
            const matchedProjectItems = feedItems.filter(item => {
                const itemCode = (item.projectCode || item.metadata?.project_code || item.metadata?.projectCode || "").toUpperCase();
                const fullItemText = `${item.title} ${item.subtitle || ""} ${item.description || ""} ${item.metadata?.projectName || ""}`.toUpperCase();
                return itemCode === targetProjectCode || fullItemText.includes(targetProjectCode);
            });

            return matchedProjectItems.length > 0 ? matchedProjectItems : currentChannelFeed;
        }

        return feedItems;
    }, [isWorkspaceModule, selectedModule, navMode, targetProjectCode, feedItems, currentChannelFeed]);

    return (
        <div className={clsx(
            "w-80 md:w-96 lg:w-[420px] h-full border-l border-neutral-200/40 dark:border-neutral-800/40",
            "bg-neutral-50/40 dark:bg-neutral-900/40 backdrop-blur-2xl",
            "flex flex-col relative overflow-hidden shrink-0 transition-all duration-200",
            "hidden md:flex"
        )}>
            {/* VIEW A: Active Pumble Thread Panel */}
            {activeThreadMessage ? (
                <div className="p-4 h-full overflow-y-auto scrollbar-hide">
                    <PumbleThreadPanel
                        thread={activeThreadMessage}
                        onClose={() => setActiveThreadMessage(null)}
                        channelCode={currentChannel.code}
                        onSendReply={(replyText) => {
                            setActiveThreadMessage(prev => prev ? {
                                ...prev,
                                replies: [
                                    ...prev.replies,
                                    {
                                        id: `r-${Date.now()}`,
                                        sender: "You",
                                        time: "Just now",
                                        content: replyText
                                    }
                                ]
                            } : null);
                        }}
                    />
                </div>
            ) : selectedItem ? (
                /* VIEW B: Stream Activity Detail Panel */
                <div className="p-4 h-full overflow-y-auto scrollbar-hide">
                    <StreamDetailPanel
                        item={selectedItem}
                        onClose={() => setSelectedItem(null)}
                        onReloadFeed={loadFeed}
                    />
                </div>
            ) : (
                /* VIEW C: Activity Feed Panel with SMOOTH GRADIENT MASK STICKY BLUR HEADER */
                <div className="flex-1 overflow-y-auto scrollbar-hide relative flex flex-col">
                    {/* SMOOTH GLASSMORPHISM BLUR STICKY HEADER */}
                    <div
                        style={{
                            WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
                            maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)"
                        }}
                        className={clsx(
                            "sticky top-0 z-30 px-5 pt-4 pb-6 shrink-0 transition-all",
                            "bg-gradient-to-b from-white/90 via-white/75 to-white/0 dark:from-neutral-900/90 dark:via-neutral-900/75 dark:to-neutral-900/0",
                            "backdrop-blur-xl backdrop-saturate-150"
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={clsx(
                                    "w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 shadow-2xs",
                                    isWorkspaceModule && selectedModule === "finance"
                                        ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                )}>
                                    {isWorkspaceModule && selectedModule === "finance" ? (
                                        <CreditCard className="w-4 h-4" />
                                    ) : (
                                        <Activity className="w-4 h-4" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[14px] font-extrabold text-neutral-900 dark:text-white tracking-tight truncate leading-tight">
                                        {isWorkspaceModule
                                            ? `${selectedModule.charAt(0).toUpperCase() + selectedModule.slice(1)} Activity`
                                            : "Operational Activity"
                                        }
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FEED LIST SCROLLING SMOOTHLY UNDER HEADER */}
                    <div className="px-4 -mt-4 pt-0 pb-8 flex-1">
                        <StreamFeed
                            items={displayFeed}
                            isLoading={isLoadingFeed}
                            onItemTap={(item) => setSelectedItem(item)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function extractProjectCode(channelCode?: string, channelName?: string): string | null {
    if (!channelCode) return null;
    const cleanCode = channelCode.toUpperCase().trim();
    const parts = cleanCode.split("-");
    if (parts.length >= 2 && parts[1].length >= 2) {
        return parts[1]; // e.g. "037-JPF" -> "JPF", "039-RBH" -> "RBH"
    }
    const nameUpper = (channelName || "").toUpperCase();
    if (nameUpper.includes("JPADEL") || nameUpper.includes("FATMAWATI") || cleanCode.includes("JPF")) return "JPF";
    if (nameUpper.includes("RUBY") || cleanCode.includes("RBH")) return "RBH";
    if (nameUpper.includes("RAWAMANGUN") || cleanCode.includes("RWM")) return "RWM";
    if (nameUpper.includes("PRECISION") || cleanCode.includes("PRG")) return "PRG";
    if (nameUpper.includes("JALU") || cleanCode.includes("JLP")) return "JLP";
    if (nameUpper.includes("PULO ASEM") || cleanCode.includes("KPA")) return "KPA";
    return null;
}
