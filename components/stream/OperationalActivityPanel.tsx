"use client";

import React from "react";
import clsx from "clsx";
import { Activity } from "lucide-react";

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
    feedItems,
    currentChannelFeed,
    selectedChannelCode,
    isLoadingFeed,
    loadFeed,
}: OperationalActivityPanelProps) {
    return (
        <div className={clsx(
            "w-80 lg:w-96 h-full border-l border-neutral-200/30 dark:border-neutral-800/30",
            "p-4 bg-neutral-50/40 dark:bg-neutral-900/30 backdrop-blur-xl",
            "overflow-y-auto shrink-0 flex flex-col gap-4 scrollbar-hide",
            "hidden md:flex"
        )}>
            {activeThreadMessage ? (
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
            ) : selectedItem ? (
                <StreamDetailPanel
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onReloadFeed={loadFeed}
                />
            ) : (() => {
                const rightPanelFeed = navMode === "project_channel" ? currentChannelFeed : feedItems;
                const isFiltered = navMode === "project_channel" && selectedChannelCode !== "000-gen";
                return (
                <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between px-1 shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                <Activity className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-[13px] font-bold text-neutral-700 dark:text-neutral-300">
                                    Operational Activity
                                </h3>
                                <p className="text-[10px] text-neutral-400 font-medium">
                                    {isFiltered
                                        ? `${currentChannel.name} (${rightPanelFeed.length})`
                                        : `Live Stream Feed (${feedItems.length})`
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <StreamFeed
                            items={rightPanelFeed}
                            isLoading={isLoadingFeed}
                            onItemTap={(item) => setSelectedItem(item)}
                        />
                    </div>
                </div>
                );
            })()}
        </div>
    );
}
