"use client";

import React from "react";
import clsx from "clsx";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
    Sparkles,
    CheckSquare,
    Inbox,
    Hash,
    ChevronDown,
    ChevronRight,
    Plus,
    CreditCard,
    Package,
    FileText,
    User,
    Clock,
    Users,
    ArrowLeft,
    Settings,
    Sun,
    Moon,
    PanelLeft,
    FolderKanban,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { SidebarNavItem, WorkspaceSubNavItem } from "./stream-nav-helpers";
import type { FeedItem } from "@/lib/stream/types";

export type SidebarNavMode = "ask_adidaya" | "tasks" | "inbox" | "project_channel" | "workspace_module";

export interface ProjectChannel {
    id?: string;
    code: string;
    name: string;
    city: string;
    projectCode: string;
    stage: string;
}

interface StreamSidebarProps {
    navMode: SidebarNavMode;
    setNavMode: (mode: SidebarNavMode) => void;
    isProjectsExpanded: boolean;
    setIsProjectsExpanded: (v: boolean) => void;
    isWorkspaceExpanded: boolean;
    setIsWorkspaceExpanded: (v: boolean) => void;
    selectedChannelCode: string;
    setSelectedChannelCode: (code: string) => void;
    selectedModule: string;
    setSelectedModule: (module: string) => void;
    setShowAllProjectsModal: (v: boolean) => void;
    setActiveChannelSubTab: (tab: "overview" | "chat" | "files" | "activity" | "tracking" | "more") => void;
    setIsChannelHeaderScrolled: (v: boolean) => void;
    projectChannels: ProjectChannel[];
    pinnedChannels: ProjectChannel[];
    feedItems: FeedItem[];
    mounted: boolean;
    isLeftOpen?: boolean;
    onToggleLeft?: () => void;
}

export default function StreamSidebar({
    navMode,
    setNavMode,
    isProjectsExpanded,
    setIsProjectsExpanded,
    isWorkspaceExpanded,
    setIsWorkspaceExpanded,
    selectedChannelCode,
    setSelectedChannelCode,
    selectedModule,
    setSelectedModule,
    setShowAllProjectsModal,
    setActiveChannelSubTab,
    setIsChannelHeaderScrolled,
    projectChannels,
    pinnedChannels,
    feedItems,
    mounted,
    isLeftOpen = true,
    onToggleLeft,
}: StreamSidebarProps) {
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const pendingInboxCount = feedItems.filter(i => i.status === "pending").length;

    return (
        <div className={clsx(
            "shrink-0 h-full flex flex-col transition-all duration-300 ease-in-out overflow-hidden relative p-2",
            isLeftOpen ? "w-64 sm:w-72 opacity-100" : "w-16 sm:w-20 opacity-100"
        )}>
            <div className="h-full flex flex-col rounded-[20px] overflow-hidden bg-white/50 dark:bg-neutral-900/60 backdrop-blur-2xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm">

                {/* Top Sidebar Header */}
                <div className={clsx(
                    "p-3.5 border-b border-neutral-200/30 dark:border-neutral-800/30 shrink-0 flex items-center",
                    isLeftOpen ? "justify-between" : "justify-center"
                )}>
                    {isLeftOpen && (
                        <div className="flex items-center gap-2.5 min-w-0">
                            <svg viewBox="0 0 964.35 1080" className="w-5 h-5 shrink-0 fill-neutral-900 dark:fill-white">
                                <path d="M594.49,903.79h-228.27c-11.87,13.85-19.27,29.88-26.63,46.08-11.98,26.37-24.48,52.51-37.04,78.61-22.58,46.93-92.55,66.66-141.78,37.26-51.77-30.92-62.49-101.56-34.65-143.17,16.71-24.96,35.58-48.51,54.05-72.25,37.65-48.36,75.68-96.42,113.57-144.59,20.65-26.26,41.66-52.24,61.86-78.84,9.22-12.15,20.39-23.37,25.76-41.41-7.42.78-12.75.84-17.85,1.94-71.85,15.58-143.67,31.34-215.51,46.95-10.89,2.37-21.82,4.98-32.87,6.08-41.21,4.08-74.44-10.21-97.88-44.9-21.18-31.34-21.71-64.89-7.9-98.88,11.5-28.31,51.09-63.38,96.47-60.16,19.97,1.42,39.82,4.76,59.67,7.65,66.15,9.65,132.27,19.54,198.44,29.14,3.89.56,8.02-.59,14.77-1.18-6-16.1-16.08-26.52-24.76-37.56-50.95-64.85-102.22-129.45-153.28-194.21-17.93-22.74-35.35-45.89-53.44-68.5-26.39-32.97-30.18-70.02-13.69-106.91C149.95,28.25,180.6,5.83,221.41.97c51.94-6.19,90.43,17.48,111.64,66.07,45.48,104.18,91.23,208.23,137.04,312.26,3.47,7.87,8.37,15.1,12.23,21.96,12.77-.89,12.84-10.49,15.35-17.01,18.38-47.86,36.05-95.99,54.36-143.87,5.96-15.59,12.23-31.21,20.01-45.94,25.26-47.81,87.64-63.42,136.08-38.72,66.49,33.91,75.74,119,23.52,168.74-45.18,43.04-88.7,87.84-132.79,132.02-5.13,5.14-9.27,11.28-16.71,20.45,12.45-1.28,20.14-1.48,27.58-2.93,68.85-13.48,137.65-27.24,206.49-40.77,10.92-2.15,21.98-3.58,32.98-5.31,73.62-11.54,137.51,59.72,107.62,139.6-13.97,37.34-42.32,59.67-82.74,63.4-14.24,1.31-29.06.14-43.23-2.23-70.31-11.77-140.47-24.39-210.72-36.51-10.65-1.84-21.5-5.24-32.2-.68-2.31,11.33,6.02,17.05,11.23,23.59,58.33,73.23,116.98,146.19,175.58,219.2,16.04,19.98,32.84,39.4,48.06,59.99,9.2,12.44,18.2,25.81,23.57,40.15,18.31,48.88-1.16,100.05-46.49,126.29-17.4,10.07-34.7,19.33-56.07,19.27-41.55-.11-73.93-16.3-93.5-53.06-13.57-25.49-23.87-52.72-35.72-79.13-6.33-14.11-12.84-28.13-20.11-44.02ZM482.56,651.15c-2.42,1.41-5.27,2.05-6.02,3.66-23.27,50.31-46.39,100.7-69.27,151.19-1.2,2.65-.15,6.32-.15,10.03,3.26.81,6.3,2.24,9.35,2.24,44.36-.06,88.73-.31,133.09-.58,1.03,0,2.27-.54,3.03-1.25.7-.64.89-1.85,2.17-4.79-17.94-51.94-43.44-102.41-65.3-154.37-1.1-2.61-4.64-4.2-6.89-6.13Z" />
                            </svg>
                            <span className="text-[14px] font-bold text-neutral-900 dark:text-white tracking-tight truncate">
                                Adidaya Studio
                            </span>
                        </div>
                    )}

                    {onToggleLeft && (
                        <button
                            onClick={onToggleLeft}
                            className="p-1.5 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors shrink-0"
                            title={isLeftOpen ? "Minimize Sidebar (⌘B)" : "Expand Sidebar (⌘B)"}
                        >
                            <PanelLeft className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Navigation Items */}
                {isLeftOpen ? (
                    <div className="flex-1 h-full overflow-y-auto p-2.5 space-y-4 scrollbar-hide">

                        {/* SECTION 1: PRIMARY STREAM NAVIGATION */}
                        <div className="space-y-0.5">
                            <SidebarNavItem
                                active={navMode === "ask_adidaya"}
                                onClick={() => { setNavMode("ask_adidaya"); router.push("/stream/ask-adidaya"); }}
                                icon={<Sparkles className="w-4 h-4" />}
                                label="AskAdidaya"
                            />
                            <SidebarNavItem
                                active={navMode === "tasks"}
                                onClick={() => { setNavMode("tasks"); router.push("/stream/tasks"); }}
                                icon={<CheckSquare className="w-4 h-4" />}
                                label="Tasks"
                            />
                            <SidebarNavItem
                                active={navMode === "inbox"}
                                onClick={() => { setNavMode("inbox"); router.push("/stream/inbox"); }}
                                icon={<Inbox className="w-4 h-4" />}
                                label="Inbox"
                                badge={pendingInboxCount || undefined}
                            />
                        </div>

                        {/* SECTION 2: PROJECTS ACCORDION */}
                        <div className="space-y-1 pt-1">
                            <button
                                onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
                                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    {isProjectsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    <span className="text-[11px] font-bold uppercase tracking-wider">
                                        Projects
                                    </span>
                                </div>
                                <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-100 dark:bg-neutral-800/80 px-1.5 py-0.2 rounded-full">
                                    {projectChannels.length}
                                </span>
                            </button>

                            <div className="space-y-0.5 pl-1">
                                {(isProjectsExpanded ? projectChannels : pinnedChannels).map((channel) => {
                                    const isSelected = navMode === "project_channel" && selectedChannelCode === channel.code;
                                    return (
                                        <button
                                            key={channel.code}
                                            onClick={() => {
                                                setNavMode("project_channel");
                                                setSelectedChannelCode(channel.code);
                                                setActiveChannelSubTab("chat");
                                                setIsChannelHeaderScrolled(false);
                                                router.push(`/stream/channels/${channel.code}`);
                                            }}
                                            className={clsx(
                                                "w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left transition-all",
                                                isSelected
                                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20"
                                                    : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 font-medium"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Hash className={clsx("w-3.5 h-3.5 shrink-0", isSelected ? "text-blue-600 dark:text-blue-400" : "text-neutral-400 dark:text-neutral-500")} />
                                                <span className="text-[12px] truncate font-mono">
                                                    {channel.code}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}

                                {!isProjectsExpanded && projectChannels.length > 4 && (
                                    <button
                                        onClick={() => setShowAllProjectsModal(true)}
                                        className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>All Projects ({projectChannels.length})</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* SECTION 3: WORKSPACE ACCORDION */}
                        <div className="space-y-1 pt-1">
                            <button
                                onClick={() => setIsWorkspaceExpanded(!isWorkspaceExpanded)}
                                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    {isWorkspaceExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    <span className="text-[11px] font-bold uppercase tracking-wider">
                                        Workspace
                                    </span>
                                </div>
                            </button>

                            {isWorkspaceExpanded && (
                                <div className="space-y-0.5 pl-1">
                                    <WorkspaceSubNavItem
                                        active={navMode === "workspace_module" && selectedModule === "finance"}
                                        onClick={() => { setNavMode("workspace_module"); setSelectedModule("finance"); router.push("/stream/finance/overview"); }}
                                        icon={<CreditCard className="w-3.5 h-3.5" />}
                                        label="Finance"
                                    />
                                    <WorkspaceSubNavItem
                                        active={navMode === "workspace_module" && selectedModule === "resources"}
                                        onClick={() => { setNavMode("workspace_module"); setSelectedModule("resources"); router.push("/stream/resources/overview"); }}
                                        icon={<Package className="w-3.5 h-3.5" />}
                                        label="Resources"
                                    />
                                    <WorkspaceSubNavItem
                                        active={navMode === "workspace_module" && selectedModule === "reports"}
                                        onClick={() => { setNavMode("workspace_module"); setSelectedModule("reports"); router.push("/stream/reports/overview"); }}
                                        icon={<FileText className="w-3.5 h-3.5" />}
                                        label="Reports"
                                    />
                                    <WorkspaceSubNavItem
                                        active={navMode === "workspace_module" && selectedModule === "people"}
                                        onClick={() => { setNavMode("workspace_module"); setSelectedModule("people"); router.push("/stream/people/overview"); }}
                                        icon={<User className="w-3.5 h-3.5" />}
                                        label="People"
                                    />
                                    <WorkspaceSubNavItem
                                        active={navMode === "workspace_module" && selectedModule === "clock"}
                                        onClick={() => { setNavMode("workspace_module"); setSelectedModule("clock"); router.push("/stream/clock/overview"); }}
                                        icon={<Clock className="w-3.5 h-3.5" />}
                                        label="Clock"
                                    />
                                    <WorkspaceSubNavItem
                                        active={navMode === "workspace_module" && selectedModule === "crew"}
                                        onClick={() => { setNavMode("workspace_module"); setSelectedModule("crew"); router.push("/stream/crew/directory"); }}
                                        icon={<Users className="w-3.5 h-3.5" />}
                                        label="Crew"
                                    />
                                </div>
                            )}
                        </div>

                    </div>
                ) : (
                    /* COLLAPSED ICON RAIL NAV - FULL VERTICAL LIST */
                    <div className="flex-1 h-full overflow-y-auto py-2.5 px-1 space-y-2 flex flex-col items-center scrollbar-hide">
                        {/* Stream Primary Views */}
                        <button
                            onClick={() => { setNavMode("ask_adidaya"); router.push("/stream/ask-adidaya"); }}
                            title="AskAdidaya"
                            className={clsx(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                navMode === "ask_adidaya"
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 shadow-xs"
                                    : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                            )}
                        >
                            <Sparkles className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => { setNavMode("tasks"); router.push("/stream/tasks"); }}
                            title="Tasks"
                            className={clsx(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                navMode === "tasks"
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 shadow-xs"
                                    : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                            )}
                        >
                            <CheckSquare className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => { setNavMode("inbox"); router.push("/stream/inbox"); }}
                            title="Inbox"
                            className={clsx(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-all relative",
                                navMode === "inbox"
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 shadow-xs"
                                    : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                            )}
                        >
                            <Inbox className="w-4 h-4" />
                            {pendingInboxCount > 0 && (
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
                            )}
                        </button>

                        <div className="w-5 h-[1px] bg-neutral-200/50 dark:bg-neutral-800/50 my-0.5" />

                        {/* Projects View */}
                        <button
                            onClick={() => setShowAllProjectsModal(true)}
                            title={`Projects (${projectChannels.length})`}
                            className={clsx(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                navMode === "project_channel"
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 shadow-xs"
                                    : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                            )}
                        >
                            <FolderKanban className="w-4 h-4" />
                        </button>

                        <div className="w-5 h-[1px] bg-neutral-200/50 dark:bg-neutral-800/50 my-0.5" />

                        {/* Workspace Modules */}
                        <button
                            onClick={() => { setNavMode("workspace_module"); setSelectedModule("finance"); router.push("/stream/finance/overview"); }}
                            title="Finance Workspace"
                            className={clsx(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                navMode === "workspace_module" && selectedModule === "finance"
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 shadow-xs"
                                    : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                            )}
                        >
                            <CreditCard className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => { setNavMode("workspace_module"); setSelectedModule("resources"); router.push("/stream/resources/overview"); }}
                            title="Resources Workspace"
                            className={clsx(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                navMode === "workspace_module" && selectedModule === "resources"
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 shadow-xs"
                                    : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                            )}
                        >
                            <Package className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => { setNavMode("workspace_module"); setSelectedModule("reports"); router.push("/stream/reports/overview"); }}
                            title="Reports Workspace"
                            className={clsx(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                navMode === "workspace_module" && selectedModule === "reports"
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 shadow-xs"
                                    : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                            )}
                        >
                            <FileText className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => { setNavMode("workspace_module"); setSelectedModule("people"); router.push("/stream/people/overview"); }}
                            title="People Workspace"
                            className={clsx(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                navMode === "workspace_module" && selectedModule === "people"
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 shadow-xs"
                                    : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                            )}
                        >
                            <User className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => { setNavMode("workspace_module"); setSelectedModule("clock"); router.push("/stream/clock/overview"); }}
                            title="Clock Workspace"
                            className={clsx(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                navMode === "workspace_module" && selectedModule === "clock"
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 shadow-xs"
                                    : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                            )}
                        >
                            <Clock className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => { setNavMode("workspace_module"); setSelectedModule("crew"); router.push("/stream/crew/directory"); }}
                            title="Crew Workspace"
                            className={clsx(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                navMode === "workspace_module" && selectedModule === "crew"
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 shadow-xs"
                                    : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                            )}
                        >
                            <Users className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* SIDEBAR FOOTER */}
                <div className={clsx(
                    "p-2 border-t border-neutral-200/30 dark:border-neutral-800/30 shrink-0",
                    isLeftOpen ? "space-y-0.5" : "flex flex-col items-center space-y-1"
                )}>
                    {isLeftOpen ? (
                        <>
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                                <span>Back to Adidaya App</span>
                            </Link>

                            <Link
                                href="/settings"
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition-colors"
                            >
                                <Settings className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                                <span>Settings</span>
                            </Link>

                            {mounted && (
                                <button
                                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition-colors"
                                >
                                    {theme === "dark" ? (
                                        <Moon className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                                    ) : (
                                        <Sun className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                                    )}
                                    <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <Link
                                href="/dashboard"
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
                                title="Back to Adidaya App"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                            <Link
                                href="/settings"
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
                                title="Settings"
                            >
                                <Settings className="w-4 h-4" />
                            </Link>
                            {mounted && (
                                <button
                                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
                                    title="Toggle Theme"
                                >
                                    {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                </button>
                            )}
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}
