"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { Activity, CreditCard, Send, Plus, Save, Bell, PanelRight } from "lucide-react";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";

import StreamFeed from "./StreamFeed";
import StreamDetailPanel from "./StreamDetailPanel";
import PumbleThreadPanel from "./PumbleThreadPanel";
import ProjectFileDetailPanel from "./ProjectFileDetailPanel";
import UploadFilesDrawer from "./UploadFilesDrawer";
import type { ProjectFileItem } from "./ProjectFilesTab";
import type { ThreadData } from "./PumbleThreadPanel";
import type { ProjectChannel } from "./StreamSidebar";
import type { SidebarNavMode } from "./StreamSidebar";
import type { FeedItem } from "@/lib/stream/types";

interface OperationalActivityPanelProps {
    activeThreadMessage: ThreadData | null;
    setActiveThreadMessage: React.Dispatch<React.SetStateAction<ThreadData | null>>;
    selectedItem: FeedItem | null;
    setSelectedItem: (item: FeedItem | null) => void;
    selectedFile?: ProjectFileItem | null;
    setSelectedFile?: (file: ProjectFileItem | null) => void;
    currentChannel: ProjectChannel;
    navMode: SidebarNavMode;
    selectedModule?: string;
    feedItems: FeedItem[];
    currentChannelFeed: FeedItem[];
    selectedChannelCode: string;
    isLoadingFeed: boolean;
    loadFeed: () => Promise<void>;
    onSendPrompt?: (text: string) => void;
    isProcessingPrompt?: boolean;
    hasNewActivity?: boolean;
    onRefreshFeed?: () => void;
    onSaveConversation?: () => void;
    isRightOpen?: boolean;
    onToggleRight?: () => void;
    favoritedFileIds?: string[];
    onToggleFavorite?: (fileId: string) => void;
    onRenameFile?: (fileId: string, newName: string) => void;
    onDeleteFile?: (fileId: string) => void;
    isUploadOpen?: boolean;
    onCloseUpload?: () => void;
    onUploadSuccess?: (newFiles: ProjectFileItem[]) => void;
}

export default function OperationalActivityPanel({
    activeThreadMessage,
    setActiveThreadMessage,
    selectedItem,
    setSelectedItem,
    selectedFile,
    setSelectedFile,
    currentChannel,
    navMode,
    selectedModule = "finance",
    feedItems,
    currentChannelFeed,
    selectedChannelCode,
    isLoadingFeed,
    loadFeed,
    onSendPrompt,
    isProcessingPrompt,
    hasNewActivity = false,
    onRefreshFeed,
    onSaveConversation,
    isRightOpen = true,
    onToggleRight,
    favoritedFileIds,
    onToggleFavorite,
    onRenameFile,
    onDeleteFile,
    isUploadOpen = false,
    onCloseUpload,
    onUploadSuccess,
}: OperationalActivityPanelProps) {
    const { theme } = useTheme();
    const [promptText, setPromptText] = useState("");
    const searchParams = useSearchParams();
    const activeViewMode = React.useMemo(() => {
        if (typeof window !== "undefined") {
            const urlView = searchParams.get("view") as "personal" | "team" | null;
            const stored = sessionStorage.getItem("adidaya_finance_view_mode") as "personal" | "team" | null;
            return urlView || stored || "personal";
        }
        return "personal";
    }, [searchParams]);

    const isWorkspaceModule = navMode === "workspace_module";
    const targetProjectCode = extractProjectCode(selectedChannelCode, currentChannel?.name || currentChannel?.code);

    const displayFeed = React.useMemo(() => {
        // Mode 1: Module View (Strict Module Taxonomy Filtering)
        if (isWorkspaceModule) {
            return feedItems.filter(item => {
                let matchesModule = false;
                if (selectedModule === "finance") {
                    matchesModule = item.parentModule === "finance" || item.type === "expense_logged" || item.entityType === "expense";
                } else if (selectedModule === "resources") {
                    matchesModule = item.parentModule === "resources" || item.submodule === "Materials" || item.submodule === "Tools" || item.submodule === "Inventory";
                } else if (selectedModule === "reports") {
                    matchesModule = item.parentModule === "reports" || item.type === "progress_updated" || item.submodule === "Daily Report" || item.submodule === "DCR";
                } else if (selectedModule === "clock") {
                    matchesModule = item.parentModule === "clock" || item.submodule === "Clock";
                } else if (selectedModule === "crew") {
                    matchesModule = item.parentModule === "crew" || item.submodule === "Crew";
                } else {
                    matchesModule = item.parentModule === selectedModule;
                }

                return matchesModule;
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
    }, [isWorkspaceModule, selectedModule, activeViewMode, navMode, targetProjectCode, feedItems, currentChannelFeed]);


    return (
        <div className={clsx(
            "h-full border-l border-neutral-200/40 dark:border-neutral-800/40",
            "bg-neutral-50/40 dark:bg-neutral-900/40 backdrop-blur-2xl",
            "flex flex-col relative overflow-hidden shrink-0 transition-all duration-300 ease-in-out hidden md:flex",
            isRightOpen ? "w-80 md:w-96 lg:w-[420px]" : "w-14 sm:w-16"
        )}>
            {!isRightOpen ? (
                /* COLLAPSED RIGHT ACTIVITY RAIL */
                <div className="h-full flex flex-col items-center justify-between py-3.5 px-1 relative select-none">
                    {/* Top: PanelRight Toggle & Activity Badge */}
                    <div className="flex flex-col items-center gap-3 w-full">
                        {onToggleRight && (
                            <button
                                onClick={onToggleRight}
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors shrink-0"
                                title="Expand Activity Panel (⌘Shift+B)"
                            >
                                <PanelRight className="w-4 h-4" />
                            </button>
                        )}

                        <button
                            onClick={onToggleRight}
                            title="Expand Activity Feed"
                            className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 transition-all relative group cursor-pointer"
                        >
                            <Activity className="w-4 h-4" />
                            {hasNewActivity && (
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-neutral-900 animate-pulse" />
                            )}
                        </button>
                    </div>

                    {/* Middle: Activity Count Badge */}
                    <div className="flex flex-col items-center gap-2">
                        {displayFeed.length > 0 && (
                            <button
                                onClick={onToggleRight}
                                title={`${displayFeed.length} Activities`}
                                className="w-7 h-7 rounded-full bg-neutral-200/60 dark:bg-neutral-800/60 flex items-center justify-center text-[10px] font-extrabold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                            >
                                {displayFeed.length > 99 ? "99+" : displayFeed.length}
                            </button>
                        )}
                    </div>

                    {/* Bottom: Send Prompt Icon Button */}
                    <button
                        onClick={onToggleRight}
                        title="Send Prompt / Open Chat"
                        className="w-9 h-9 rounded-full bg-[#0A84FF] hover:bg-blue-600 active:scale-90 text-white flex items-center justify-center shadow-md transition-all shrink-0 cursor-pointer"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                /* EXPANDED ACTIVITY PANEL (Thread / Detail / Feed) */
                <>
                    {/* VIEW A: Active Pumble Thread Panel */}
                    {activeThreadMessage ? (
                        <div className="p-4 h-full overflow-y-auto scrollbar-hide relative">
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
                    ) : isUploadOpen ? (
                        /* VIEW B0: Upload Files Drawer Panel */
                        <div className="h-full overflow-y-auto scrollbar-hide relative">
                            <UploadFilesDrawer
                                channelCode={currentChannel.code}
                                channelName={currentChannel.name}
                                onClose={() => onCloseUpload && onCloseUpload()}
                                onUploadSuccess={(newFiles) => {
                                    if (onUploadSuccess) onUploadSuccess(newFiles);
                                    if (onCloseUpload) onCloseUpload();
                                }}
                            />
                        </div>
                    ) : selectedFile ? (
                        /* VIEW B1: File Detail Panel */
                        <div className="h-full overflow-y-auto scrollbar-hide relative">
                            <ProjectFileDetailPanel
                                file={selectedFile}
                                onClose={() => setSelectedFile && setSelectedFile(null)}
                                channelCode={currentChannel.code}
                                onRenameFile={(fileId, newName) => {
                                    if (onRenameFile) onRenameFile(fileId, newName);
                                    else selectedFile.name = newName;
                                }}
                                onDeleteFile={(fileId) => {
                                    if (onDeleteFile) onDeleteFile(fileId);
                                    if (setSelectedFile) setSelectedFile(null);
                                }}
                                isFavorite={favoritedFileIds ? favoritedFileIds.includes(selectedFile.id) : selectedFile.isFavorite}
                                onToggleFavorite={onToggleFavorite}
                            />
                        </div>
                    ) : selectedItem ? (
                        /* VIEW B2: Stream Activity Detail Panel */
                        <div className="p-4 h-full overflow-y-auto scrollbar-hide relative">
                            {onToggleRight && (
                                <button
                                    onClick={onToggleRight}
                                    className="absolute top-3 right-3 z-50 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors"
                                    title="Minimize Panel"
                                >
                                    <PanelRight className="w-4 h-4" />
                                </button>
                            )}
                            <StreamDetailPanel
                                item={selectedItem}
                                onClose={() => setSelectedItem(null)}
                                onReloadFeed={loadFeed}
                            />
                        </div>
                    ) : (
                        /* VIEW C: Activity Feed Panel with SMOOTH GRADIENT MASK STICKY BLUR HEADER */
                        <div className="flex-1 h-full relative flex flex-col overflow-hidden">
                            {/* The Portal Target is always mounted under absolute layout when not in thread/detail mode */}
                            <div id="crew-activity-portal-target" className="absolute inset-0 z-[60] p-4 empty:hidden bg-neutral-50 dark:bg-neutral-950 overflow-y-auto scrollbar-hide" />
                            
                            <div className="flex-1 overflow-y-auto scrollbar-hide relative flex flex-col pb-28">
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
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div className="min-w-0">
                                                <h3 className="text-[14px] font-extrabold text-neutral-900 dark:text-white tracking-tight truncate leading-tight">
                                                    {isWorkspaceModule
                                                        ? `${selectedModule.charAt(0).toUpperCase() + selectedModule.slice(1)} Activity`
                                                        : "Operational Activity"
                                                    }
                                                </h3>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {isWorkspaceModule && displayFeed.some(item => item.type === ("chat_prompt" as any) || item.type === ("chat_response" as any)) && onSaveConversation && (
                                                <button
                                                    onClick={onSaveConversation}
                                                    className={clsx(
                                                        "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight transition-all",
                                                        "bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20",
                                                        "flex items-center gap-1 active:scale-95 shrink-0"
                                                    )}
                                                >
                                                    <Save className="w-3 h-3" />
                                                    Save Chat
                                                </button>
                                            )}

                                            {onToggleRight && (
                                                <button
                                                    onClick={onToggleRight}
                                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors shrink-0"
                                                    title="Minimize Activity Panel (⌘⇧B)"
                                                >
                                                    <PanelRight className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                        {/* New Activity Notification Banner */}
                        {hasNewActivity && onRefreshFeed && (
                            <div className="px-4 mb-3 animate-fade-in shrink-0">
                                <button
                                    onClick={onRefreshFeed}
                                    className={clsx(
                                        "w-full py-2 px-3 rounded-2xl flex items-center justify-between transition-all",
                                        "bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-amber-500/10",
                                        "border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-extrabold tracking-tight",
                                        "shadow-sm hover:scale-[0.99] active:scale-[0.97]"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <Bell className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
                                        <span>NEW ACTIVITY DETECTED</span>
                                    </div>
                                    <span className="underline decoration-dotted">Click to Refresh</span>
                                </button>
                            </div>
                        )}

                        {/* FEED LIST SCROLLING SMOOTHLY UNDER HEADER */}
                        <div className="px-4 -mt-4 pt-0 pb-8">
                            <StreamFeed
                                items={displayFeed}
                                isLoading={isLoadingFeed}
                                onItemTap={(item) => setSelectedItem(item)}
                                module={selectedModule}
                                navMode={navMode}
                            />
                        </div>
                    </div>

                    {/* Chat Input sticky at bottom of Activity Panel */}
                    {onSendPrompt && (
                        <div className="absolute bottom-4 left-4 right-4 z-50 pointer-events-auto flex items-center gap-2">
                            <button
                                type="button"
                                className="w-9 h-9 rounded-full bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-700 transition-all shrink-0 shadow-sm"
                            >
                                <Plus className="w-5 h-5 stroke-[2.5]" />
                            </button>

                            <div
                                style={{
                                    background: theme === "dark"
                                        ? "linear-gradient(180deg, rgba(30,30,34,0.95) 0%, rgba(20,20,24,0.85) 100%)"
                                        : "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(245,245,250,0.85) 100%)",
                                    backdropFilter: "blur(32px) saturate(180%)",
                                    WebkitBackdropFilter: "blur(32px) saturate(180%)",
                                    border: theme === "dark"
                                        ? "1px solid rgba(255,255,255,0.12)"
                                        : "1px solid rgba(0,0,0,0.1)",
                                }}
                                className="flex-1 flex items-center gap-2 px-4 py-1.5 rounded-full shadow-md focus-within:border-[#0A84FF] transition-all"
                            >
                                <input
                                    type="text"
                                    placeholder={
                                        isWorkspaceModule
                                            ? `Ask AdidayaIntelligence (${selectedModule.charAt(0).toUpperCase() + selectedModule.slice(1)})...`
                                            : "Ask AdidayaIntelligence..."
                                    }
                                    value={promptText}
                                    onChange={(e) => setPromptText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && promptText.trim() && !isProcessingPrompt) {
                                            onSendPrompt(promptText.trim());
                                            setPromptText("");
                                        }
                                    }}
                                    className="flex-1 bg-transparent border-none outline-none text-[14px] text-neutral-900 dark:text-white placeholder:text-neutral-400 py-1"
                                />
                                <button
                                    onClick={() => {
                                        if (promptText.trim() && !isProcessingPrompt) {
                                            onSendPrompt(promptText.trim());
                                            setPromptText("");
                                        }
                                    }}
                                    disabled={!promptText.trim() || isProcessingPrompt}
                                    className={clsx(
                                        "w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0",
                                        promptText.trim() && !isProcessingPrompt
                                            ? "bg-[#0A84FF] text-white shadow-sm hover:bg-blue-600 active:scale-90"
                                            : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
                                    )}
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
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
