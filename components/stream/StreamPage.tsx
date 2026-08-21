"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import clsx from "clsx";
import { useTheme } from "next-themes";
import {
    Hash,
    Plus,
    Send,
    LayoutGrid,
    MessageSquare,
    FileText,
    Activity,
    TrendingUp,
    MoreHorizontal,
    Camera,
    CloudRain,
    CheckSquare,
    CreditCard,
    Upload,
    FolderKanban,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import StreamInput from "./StreamInput";
import StreamSidebar from "./StreamSidebar";
import AskAdidayaView from "./AskAdidayaView";
import TasksView from "./TasksView";
import InboxView from "./InboxView";
import WorkspaceModuleView from "./WorkspaceModuleView";
import OperationalActivityPanel from "./OperationalActivityPanel";
import AllProjectsModal from "./AllProjectsModal";
import ChannelMessageBubble from "./ChannelMessageBubble";
import { SubTabButton, FileCard } from "./stream-nav-helpers";
import type { SidebarNavMode, ProjectChannel } from "./StreamSidebar";
import type { ThreadData } from "./PumbleThreadPanel";

import { classifyInput } from "@/lib/stream/stream-classifier";
import { fetchFeedItems } from "@/lib/stream/stream-feed";
import { fetchAllProjects } from "@/lib/api/projects";
import type { Project } from "@/types/project";
import {
    saveStreamActivity,
    updateStreamActivityStatus,
    createProjectFromStream,
    createTaskFromStream,
    logExpenseFromStream,
    updateProgressFromStream,
} from "@/lib/stream/stream-actions";

import type {
    FeedItem,
    StreamMessage,
    StreamIntentType,
} from "@/lib/stream/types";

export default function StreamPage({ params }: { params?: { slug?: string[] } }) {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Feed & Activity state
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [isLoadingFeed, setIsLoadingFeed] = useState(true);
    const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);

    // Projects list from DB
    const [projects, setProjects] = useState<Project[]>([]);

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const slug = params?.slug || [];
    
    // Parse slug on initial render
    const initialNavMode = (() => {
        if (slug.length === 0) return "ask_adidaya";
        if (slug[0] === "ask-adidaya") return "ask_adidaya";
        if (slug[0] === "inbox") return "inbox";
        if (slug[0] === "tasks") return "tasks";
        if (slug[0] === "channels") return "project_channels";
        if (["finance", "crew", "resources", "reports", "people", "clock"].includes(slug[0])) return "workspace_module";
        return "ask_adidaya";
    })();

    const initialChannelCode = slug[0] === "channels" ? slug[1] || "023-rwm" : "023-rwm";
    const initialModule = ["finance", "crew", "resources", "reports", "people", "clock"].includes(slug[0]) ? slug[0] : "finance";

    // Navigation state
    const [navMode, setNavMode] = useState<SidebarNavMode>(initialNavMode);
    const [selectedChannelCode, setSelectedChannelCode] = useState<string>(initialChannelCode);
    const [selectedModule, setSelectedModule] = useState<string>(initialModule);

    // Accordion Collapse States (Workspace default expanded as requested)
    const [isProjectsExpanded, setIsProjectsExpanded] = useState(false);
    const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(true);
    const [showAllProjectsModal, setShowAllProjectsModal] = useState(false);

    // iOS/macOS style header scroll state
    const [isChannelHeaderScrolled, setIsChannelHeaderScrolled] = useState(false);

    // Channel Sub-tabs: Overview · Chat · Files · Activity · Tracking · More (Default: Chat)
    const [activeChannelSubTab, setActiveChannelSubTab] = useState<"overview" | "chat" | "files" | "activity" | "tracking" | "more">("chat");

    // Active thread state (Pumble Right Thread Panel)
    const [activeThreadMessage, setActiveThreadMessage] = useState<ThreadData | null>(null);

    // Chat state
    const [messages, setMessages] = useState<StreamMessage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [channelMessageText, setChannelMessageText] = useState("");
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [customChannelMessages, setCustomChannelMessages] = useState<Record<string, any[]>>({});

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Sync navigation state to URL query params
    useEffect(() => {
        if (!mounted) return;
        
        let path = "/stream";
        if (navMode === "ask_adidaya") {
            path = "/stream/ask-adidaya";
        } else if (navMode === "inbox") {
            path = "/stream/inbox";
        } else if (navMode === "tasks") {
            path = "/stream/tasks";
        } else if (navMode === "project_channels" && selectedChannelCode) {
            path = `/stream/channels/${selectedChannelCode}`;
        } else if (navMode === "workspace_module" && selectedModule) {
            const parts = window.location.pathname.split("/");
            const currentSubtab = (parts.length >= 4 && parts[1] === "stream" && parts[2] === selectedModule) ? parts[3] : "overview";
            path = `/stream/${selectedModule}/${currentSubtab}`;
        }
        
        const params = new URLSearchParams(window.location.search);
        params.delete("nav");
        params.delete("module");
        params.delete("channel");
        params.delete("subtab");
        
        const search = params.toString();
        const finalUrl = search ? `${path}?${search}` : path;
        
        if (window.location.pathname + window.location.search !== finalUrl) {
            router.replace(finalUrl, { scroll: false });
        }
    }, [navMode, selectedModule, selectedChannelCode, pathname, mounted]);

    // Handle channel content scroll for iOS/macOS dynamic header
    const handleChannelScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        setIsChannelHeaderScrolled(scrollTop > 10);
    };

    // Load feed and projects from DB
    const loadFeed = useCallback(async () => {
        try {
            setIsLoadingFeed(true);
            const items = await fetchFeedItems(50);
            setFeedItems(items);
        } catch (err) {
            console.error("Failed to load feed:", err);
        } finally {
            setIsLoadingFeed(false);
        }
    }, []);

    const loadProjects = useCallback(async () => {
        try {
            const data = await fetchAllProjects();
            setProjects(data);
            if (data.length > 0) {
                const firstSlug = `${data[0].projectNumber || "000"}-${(data[0].projectCode || "PRJ").toLowerCase()}`;
                const parts = window.location.pathname.split("/");
                const pathChannel = (parts.length >= 4 && parts[1] === "stream" && parts[2] === "channels") ? parts[3] : null;
                setSelectedChannelCode(pathChannel || firstSlug);
            }
        } catch (err) {
            console.error("Failed to load projects:", err);
        }
    }, []);

    useEffect(() => {
        loadFeed();
        loadProjects();
    }, [loadFeed, loadProjects]);

    // Auto scroll chat
    useEffect(() => {
        if (navMode === "ask_adidaya") {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, navMode]);

    // Send Stream message
    const handleSend = useCallback(async (text: string, quickType?: StreamIntentType) => {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (navMode === "project_channel") {
            const userMsg = {
                id: `cuser-${Date.now()}`,
                sender: "You (Project Manager)",
                time: timeStr,
                content: text,
                role: "user",
                isSelf: true,
            };

            let classification = classifyInput(text);
            if (quickType && classification.confidence < 0.5) {
                classification = { ...classification, type: quickType };
            }

            let systemMsg: any = null;

            if (text.startsWith("/task") || classification.type === "add_task") {
                const initialTitle = text.replace(/^\/task\s*/i, "").trim() || "Pengecoran Plat Lt 3 Sisi Utara";
                systemMsg = {
                    id: `csys-${Date.now()}`,
                    sender: "AdidayaIntelligence",
                    time: timeStr,
                    role: "system",
                    isTaskDraft: true,
                    initialTitle: initialTitle,
                };
            } else if (text.startsWith("/finance") || classification.type === "log_expense") {
                const item = text.replace(/^\/(?:finance|expense)\s*/i, "").trim() || "Pengeluaran Material Site";
                systemMsg = {
                    id: `csys-${Date.now()}`,
                    sender: "AdidayaIntelligence",
                    time: timeStr,
                    role: "system",
                    attachment: {
                        type: "finance",
                        title: `Expense: ${item}`,
                        subtitle: `Pencatatan pengeluaran proyek #${selectedChannelCode}`,
                        amount: "Rp 8.500.000",
                        status: "PENDING APPROVAL"
                    }
                };
            } else if (text.startsWith("/report") || classification.type === "update_progress") {
                const target = text.replace(/^\/(?:report|progress|dcr)\s*/i, "").trim() || "DCR Progress Lapangan";
                systemMsg = {
                    id: `csys-${Date.now()}`,
                    sender: "AdidayaIntelligence",
                    time: timeStr,
                    role: "system",
                    attachment: {
                        type: "task",
                        title: `Progress Report: ${target}`,
                        subtitle: `Kategori: Structural Construction · Progress +15% di #${selectedChannelCode}`,
                        status: "UPDATED"
                    }
                };
            } else {
                systemMsg = {
                    id: `csys-${Date.now()}`,
                    sender: "AdidayaIntelligence",
                    time: timeStr,
                    content: `Instruksi diterima untuk proyek #${selectedChannelCode}. Tim operasional telah diberi notifikasi.`,
                    role: "system"
                };
            }

            setCustomChannelMessages(prev => ({
                ...prev,
                [selectedChannelCode]: [
                    ...(prev[selectedChannelCode] || []),
                    userMsg,
                    ...(systemMsg ? [systemMsg] : [])
                ]
            }));
            return;
        }

        // AskAdidaya View handling
        const userMsg: StreamMessage = {
            id: `msg-${Date.now()}`,
            role: "user",
            content: text,
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMsg]);

        setIsProcessing(true);
        const processingMsg: StreamMessage = {
            id: `proc-${Date.now()}`,
            role: "system",
            content: "",
            timestamp: new Date().toISOString(),
            isProcessing: true,
        };
        setMessages(prev => [...prev, processingMsg]);

        await new Promise(r => setTimeout(r, 600));

        let classification = classifyInput(text);
        if (quickType && classification.confidence < 0.5) {
            classification = { ...classification, type: quickType };
        }

        const activity = await saveStreamActivity(
            classification.type,
            text,
            classification.data,
            "pending"
        );

        const systemMsg: StreamMessage = {
            id: activity?.id || `sys-${Date.now()}`,
            role: "system",
            content: "",
            timestamp: new Date().toISOString(),
            classification,
            status: "pending",
        };
        setMessages(prev => prev.filter(m => !m.isProcessing).concat(systemMsg));
        setIsProcessing(false);
    }, [navMode, selectedChannelCode]);

    const handleConfirm = useCallback(async (messageId: string) => {
        const msg = messages.find(m => m.id === messageId);
        if (!msg?.classification) return;

        setIsProcessing(true);

        try {
            const { type, data } = msg.classification;

            switch (type) {
                case "create_project":
                    await createProjectFromStream(data as any, messageId);
                    break;
                case "add_task":
                    await createTaskFromStream(data as any, messageId);
                    break;
                case "log_expense":
                    await logExpenseFromStream(data as any, messageId);
                    break;
                case "update_progress":
                    await updateProgressFromStream(data as any, messageId);
                    break;
                default:
                    await updateStreamActivityStatus(messageId, "saved");
            }

            setMessages(prev =>
                prev.map(m => m.id === messageId ? { ...m, status: "saved" } : m)
            );

            await loadFeed();
        } catch (err) {
            console.error("Confirm error:", err);
        } finally {
            setIsProcessing(false);
        }
    }, [messages, loadFeed]);

    const handleDismiss = useCallback(async (messageId: string) => {
        await updateStreamActivityStatus(messageId, "dismissed");
        setMessages(prev =>
            prev.map(m => m.id === messageId ? { ...m, status: "dismissed" } : m)
        );
    }, []);

    // Format project channels list (Includes 000-gen as default top general channel)
    const generalChannel: ProjectChannel = {
        id: "gen-000",
        code: "000-gen",
        name: "General Studio",
        city: "",
        projectCode: "GEN",
        stage: "Company Workspace"
    };

    const projectChannels: ProjectChannel[] = [
        generalChannel,
        ...projects.map(p => ({
            id: p.id,
            code: `${p.projectNumber || "000"}-${(p.projectCode || "PRJ").toLowerCase()}`,
            name: p.projectName,
            city: p.location?.city || (p as any).city || "Kota Jakarta Timur",
            projectCode: p.projectCode || "PRJ",
            stage: (p as any).stage ? `Stage ${String((p as any).stage).toUpperCase()}` : "Stage 06-CN (Construction)"
        }))
    ];

    const pinnedChannels = projectChannels.slice(0, 5);

    const currentChannel = projectChannels.find(c => c.code === selectedChannelCode) || generalChannel;

    const currentChannelFeed = selectedChannelCode === "000-gen"
        ? feedItems
        : feedItems.filter(item => {
            const text = (item.title + " " + item.subtitle + " " + (item.rawInput || "")).toLowerCase();
            return text.includes(currentChannel.projectCode.toLowerCase()) || text.includes(currentChannel.name.toLowerCase()) || text.includes(currentChannel.code);
        });

    return (
        /* Outer Window Margin: p-2 sm:p-3 md:p-4 fixed inset-0 */
        <div className="h-screen w-screen bg-white dark:bg-neutral-950 p-2 sm:p-3 md:p-4 flex flex-col overflow-hidden fixed inset-0 font-sans">
            {/* Outer Window Shell */}
            <div className="flex-1 flex flex-row h-full w-full rounded-[24px] md:rounded-[28px] overflow-hidden border border-neutral-200/80 dark:border-neutral-800/80 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.08)] relative">

                {/* =========================================================
                    COLUMN 1: LEFT SIDEBAR
                ========================================================= */}
                <StreamSidebar
                    navMode={navMode}
                    setNavMode={setNavMode}
                    isProjectsExpanded={isProjectsExpanded}
                    setIsProjectsExpanded={setIsProjectsExpanded}
                    isWorkspaceExpanded={isWorkspaceExpanded}
                    setIsWorkspaceExpanded={setIsWorkspaceExpanded}
                    selectedChannelCode={selectedChannelCode}
                    setSelectedChannelCode={setSelectedChannelCode}
                    selectedModule={selectedModule}
                    setSelectedModule={setSelectedModule}
                    setShowAllProjectsModal={setShowAllProjectsModal}
                    setActiveChannelSubTab={setActiveChannelSubTab}
                    setIsChannelHeaderScrolled={setIsChannelHeaderScrolled}
                    projectChannels={projectChannels}
                    pinnedChannels={pinnedChannels}
                    feedItems={feedItems}
                    mounted={mounted}
                />

                {/* =========================================================
                    COLUMN 2: CENTER WORKSPACE (Dynamic Content)
                ========================================================= */}
                <div className="flex-1 h-full flex flex-col overflow-hidden relative min-w-0 bg-transparent">

                    {/* VIEW A: AskAdidaya (ChatGPT Stream Chat) */}
                    {navMode === "ask_adidaya" && (
                        <AskAdidayaView
                            messages={messages}
                            isProcessing={isProcessing}
                            chatContainerRef={chatContainerRef}
                            chatEndRef={chatEndRef}
                            onSend={handleSend}
                            onConfirm={handleConfirm}
                            onDismiss={handleDismiss}
                        />
                    )}

                    {/* VIEW B: Project Channel Workspace */}
                    {navMode === "project_channel" && (
                        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                            {/* Top Dynamic Floating Liquid Glass Header */}
                            <div className="absolute top-2 left-4 right-4 z-30 pointer-events-auto">
                                <div
                                    style={isChannelHeaderScrolled ? {
                                        background: theme === "dark"
                                            ? "linear-gradient(180deg, rgba(24,24,27,0.88) 0%, rgba(15,15,18,0.78) 100%)"
                                            : "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(245,245,250,0.78) 100%)",
                                        backdropFilter: "blur(32px) saturate(180%)",
                                        WebkitBackdropFilter: "blur(32px) saturate(180%)",
                                        border: theme === "dark"
                                            ? "1px solid rgba(255,255,255,0.1)"
                                            : "1px solid rgba(255,255,255,0.7)",
                                        boxShadow: theme === "dark"
                                            ? "0 12px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.08)"
                                            : "0 12px 40px rgba(0,0,0,0.08), inset 0 1px 0.5px rgba(255,255,255,0.9)",
                                    } : undefined}
                                    className={clsx(
                                        "h-13 sm:h-14 px-5 flex items-center justify-between transition-all duration-300 w-full rounded-2xl",
                                        !isChannelHeaderScrolled && "bg-transparent border border-transparent shadow-none"
                                    )}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex items-center gap-1 text-[15px] font-bold text-neutral-900 dark:text-white font-mono shrink-0">
                                            <Hash className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            <span>{currentChannel.code}</span>
                                        </div>
                                        <span className="text-neutral-300 dark:text-neutral-700 hidden sm:inline">|</span>
                                        <span className="text-[13px] text-neutral-500 dark:text-neutral-400 font-medium truncate hidden sm:inline">
                                            {currentChannel.name}
                                        </span>
                                    </div>

                                    {/* Sub-tabs Header Bar */}
                                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1 shrink-0">
                                        <SubTabButton active={activeChannelSubTab === "overview"} onClick={() => setActiveChannelSubTab("overview")} icon={<LayoutGrid className="w-3.5 h-3.5" />} label="Overview" />
                                        <SubTabButton active={activeChannelSubTab === "chat"} onClick={() => setActiveChannelSubTab("chat")} icon={<MessageSquare className="w-3.5 h-3.5" />} label="Chat" />
                                        <SubTabButton active={activeChannelSubTab === "files"} onClick={() => setActiveChannelSubTab("files")} icon={<FileText className="w-3.5 h-3.5" />} label="Files" />
                                        <SubTabButton active={activeChannelSubTab === "activity"} onClick={() => setActiveChannelSubTab("activity")} icon={<Activity className="w-3.5 h-3.5" />} label="Activity" />
                                        <SubTabButton active={activeChannelSubTab === "tracking"} onClick={() => setActiveChannelSubTab("tracking")} icon={<TrendingUp className="w-3.5 h-3.5" />} label="Tracking" />
                                        <SubTabButton active={activeChannelSubTab === "more"} onClick={() => setActiveChannelSubTab("more")} icon={<MoreHorizontal className="w-3.5 h-3.5" />} label="More" />
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Content Body */}
                            <div
                                onScroll={handleChannelScroll}
                                className="flex-1 h-full overflow-y-auto px-6 pt-16 pb-20 scrollbar-hide space-y-5"
                            >
                                {/* Universal Project Summary & Progress Banner */}
                                <div className="p-5 rounded-[24px] bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl border border-white/60 dark:border-neutral-800/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
                                    {/* LEFT SIDE: Project Code, Name, Location */}
                                    <div className="space-y-1 min-w-0 flex-1">
                                        <div className="flex items-center gap-2 font-mono text-[13px] font-bold text-blue-600 dark:text-blue-400">
                                            <span># {currentChannel.code}</span>
                                        </div>
                                        <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight truncate">
                                            {currentChannel.name}
                                        </h2>
                                        <p className="text-[12px] text-neutral-500 dark:text-neutral-400 font-medium">
                                            {currentChannel.code === "000-gen"
                                                ? "Company-wide workspace & general stream"
                                                : `${currentChannel.city || "Kota Jakarta Timur"} · ${currentChannel.stage || "Stage 06-CN (Construction)"}`}
                                        </p>
                                    </div>

                                    {/* RIGHT SIDE: 4 Progress Items Card */}
                                    <div className="md:w-80 p-3.5 rounded-2xl bg-white/50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50 space-y-2.5 shrink-0">
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-[11px] font-bold">
                                                <span className="text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">Overall Progress</span>
                                                <span className="font-mono text-blue-600 dark:text-blue-400 text-xs">85%</span>
                                            </div>
                                            <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                                                <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500" style={{ width: "85%" }} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-neutral-200/40 dark:border-neutral-700/40 text-[10px]">
                                            <div className="space-y-0.5">
                                                <div className="text-neutral-400 uppercase font-bold tracking-wider">Design</div>
                                                <div className="font-mono font-bold text-neutral-800 dark:text-neutral-200">100%</div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="text-neutral-400 uppercase font-bold tracking-wider">Build</div>
                                                <div className="font-mono font-bold text-neutral-800 dark:text-neutral-200">70%</div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="text-neutral-400 uppercase font-bold tracking-wider">Budget</div>
                                                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">80%</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* TAB 1: Chat View */}
                                {activeChannelSubTab === "chat" && (
                                    <div className="space-y-4 pt-1">
                                        <div className="text-center">
                                            <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">
                                                Today at 08:15 AM
                                            </span>
                                        </div>

                                        <ChannelMessageBubble
                                            id="msg-1"
                                            sender="Pak Budi (Site Supervisor)"
                                            time="08:15 AM"
                                            content="Selamat pagi tim Adidaya. Laporan absensi tukang hari ini total 14 personil: 4 tukang batu, 2 tukang besi, 4 pekerja cor, 4 kenek."
                                            role="user"
                                            onOpenThread={() => setActiveThreadMessage({
                                                id: "msg-1",
                                                sender: "Pak Budi (Site Supervisor)",
                                                time: "08:15 AM",
                                                content: "Selamat pagi tim Adidaya. Laporan absensi tukang hari ini total 14 personil...",
                                                replies: [
                                                    { id: "r-1", sender: "Ir. Hendra", time: "08:20 AM", content: "Siap Pak Budi, persiapkan area cor lantai 3." }
                                                ]
                                            })}
                                        />

                                        <ChannelMessageBubble
                                            id="msg-2"
                                            sender="AdidayaIntelligence"
                                            time="08:16 AM"
                                            role="system"
                                            attachment={{
                                                type: "task",
                                                title: "#T-104: Pengecoran Plat Lt 3 Sisi Utara",
                                                subtitle: "Assigned to Pak Budi · Target Selesai 21:00 WIB",
                                                status: "In Progress"
                                            }}
                                            onOpenThread={() => setActiveThreadMessage({
                                                id: "msg-2",
                                                sender: "AdidayaIntelligence",
                                                time: "08:16 AM",
                                                content: "Task #T-104 Created",
                                                attachment: {
                                                    type: "task",
                                                    title: "#T-104: Pengecoran Plat Lt 3 Sisi Utara",
                                                    subtitle: "Assigned to Pak Budi · Target Selesai 21:00 WIB",
                                                    status: "In Progress"
                                                },
                                                replies: []
                                            })}
                                        />

                                        <ChannelMessageBubble
                                            id="msg-3"
                                            sender="Ir. Hendra (Site Engineer)"
                                            time="09:30 AM"
                                            content="Progress pengecoran plat lantai 3 sisi utara sudah mencapai 85%. Kebutuhan beton ready mix 12m³ sudah dipesan ke PT Jayamix."
                                            role="user"
                                            onOpenThread={() => setActiveThreadMessage({
                                                id: "msg-3",
                                                sender: "Ir. Hendra (Site Engineer)",
                                                time: "09:30 AM",
                                                content: "Progress pengecoran plat lantai 3 sisi utara sudah mencapai 85%. Kebutuhan beton ready mix 12m³ sudah dipesan ke PT Jayamix.",
                                                replies: []
                                            })}
                                        />

                                        <ChannelMessageBubble
                                            id="msg-4"
                                            sender="AdidayaIntelligence"
                                            time="10:46 AM"
                                            role="system"
                                            attachment={{
                                                type: "finance",
                                                title: "Pengeluaran Material: Semen Padang 50 sak & Besi 12mm",
                                                subtitle: "Nota #EXP-082 dibongkar oleh Pak Eko",
                                                amount: "Rp 8.050.000",
                                                status: "Pending Approval"
                                            }}
                                            onOpenThread={() => setActiveThreadMessage({
                                                id: "msg-4",
                                                sender: "AdidayaIntelligence",
                                                time: "10:46 AM",
                                                content: "Pengeluaran Material: Semen Padang 50 sak & Besi 12mm",
                                                attachment: {
                                                    type: "finance",
                                                    title: "Pengeluaran Material: Semen Padang 50 sak & Besi 12mm",
                                                    subtitle: "Nota #EXP-082 dibongkar oleh Pak Eko",
                                                    amount: "Rp 8.050.000",
                                                    status: "Pending Approval"
                                                },
                                                replies: [
                                                    { id: "r-2", sender: "Finance Team", time: "10:50 AM", content: "Nota sedang diverifikasi." }
                                                ]
                                            })}
                                        />

                                        <div className="text-center pt-2">
                                            <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">
                                                Today at 11:20 AM
                                            </span>
                                        </div>

                                        <ChannelMessageBubble
                                            id="msg-5"
                                            sender="Arsitek Dian"
                                            time="11:20 AM"
                                            content="20250423_RWM_DETAIL_TANGGA(revisi).skp"
                                            role="user"
                                            attachment={{
                                                type: "file",
                                                title: "20250423_RWM_DETAIL_TANGGA(revisi).skp",
                                                fileSize: "BIN / SKP · 14,8 MB"
                                            }}
                                            replyCount={2}
                                            onOpenThread={() => setActiveThreadMessage({
                                                id: "msg-5",
                                                sender: "Arsitek Dian",
                                                time: "11:20 AM",
                                                content: "20250423_RWM_DETAIL_TANGGA(revisi).skp",
                                                attachment: {
                                                    type: "file",
                                                    title: "20250423_RWM_DETAIL_TANGGA(revisi).skp",
                                                    fileSize: "BIN / SKP · 14,8 MB"
                                                },
                                                replies: [
                                                    { id: "r-3", sender: "You (PM)", time: "01:15 PM", content: "Siap mba Dian, gambar revisi sudah diprint dan diserahkan ke mandor besi." },
                                                    { id: "r-4", sender: "Pak Budi", time: "01:30 PM", content: "Sudah diterima di site mba, trims!" }
                                                ]
                                            })}
                                        />

                                        <ChannelMessageBubble
                                            id="msg-6"
                                            sender="You (Project Manager)"
                                            time="01:15 PM"
                                            content="Siap mba Dian, gambar revisi sudah diprint dan diserahkan ke mandor besi di lapangan untuk penyesuaian."
                                            role="user"
                                            isSelf={true}
                                            onOpenThread={() => setActiveThreadMessage({
                                                id: "msg-6",
                                                sender: "You (Project Manager)",
                                                time: "01:15 PM",
                                                content: "Siap mba Dian, gambar revisi sudah diprint...",
                                                replies: []
                                            })}
                                        />

                                        <ChannelMessageBubble
                                            sender="Laporan Cuaca"
                                            time="03:00 PM"
                                            role="system"
                                            attachment={{
                                                type: "weather",
                                                title: "Hujan Deras di Lokasi Rawamangun",
                                                subtitle: "Mulai pukul 15:00 WIB · Pekerjaan cor luar dihentikan sementara",
                                                status: "RAIN ALERT"
                                            }}
                                        />

                                        {/* Dynamic Channel Messages (Sent by user inside this project channel) */}
                                        {(customChannelMessages[selectedChannelCode] || []).map(msg => (
                                            <ChannelMessageBubble key={msg.id} {...msg} />
                                        ))}
                                    </div>
                                )}

                                {/* TAB 2: Files View */}
                                {activeChannelSubTab === "files" && (
                                    <div className="space-y-3 pt-1">
                                        <h3 className="text-[14px] font-bold text-neutral-900 dark:text-white">
                                            Project Files &amp; 3D Models
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <FileCard name={`20250809_${currentChannel.projectCode}_LT 3.skp`} size="BIN / SketchUp" />
                                            <FileCard name={`20250809_${currentChannel.projectCode}_LT 4.skp`} size="BIN / SketchUp" />
                                        </div>
                                    </div>
                                )}

                                {/* TAB 3: Overview View */}
                                {activeChannelSubTab === "overview" && (
                                    <div className="p-5 rounded-[22px] bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl border border-white/60 dark:border-neutral-800/40 space-y-3">
                                        <h3 className="text-[16px] font-bold text-neutral-900 dark:text-white">Overview — {currentChannel.name}</h3>
                                        <p className="text-[13px] text-neutral-500 leading-relaxed">
                                            Operational hub for structural construction, procurement tracking, daily DCR reports, and team collaboration.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Absolute Floating iMessage Input Bar */}
                            {activeChannelSubTab === "chat" && (
                                <div className="absolute bottom-3 left-4 right-4 z-30 pointer-events-auto">
                                    {/* Slash Command Autocomplete Popover */}
                                    <AnimatePresence>
                                        {showSlashMenu && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 8 }}
                                                className="absolute bottom-full mb-2 left-0 right-0 p-2 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xl z-50 space-y-1 max-h-56 overflow-y-auto scrollbar-hide"
                                            >
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2.5 py-1">
                                                    Shortcut Commands
                                                </div>
                                                {[
                                                    { cmd: "/task", label: "Bikin task baru (Title, Assignee, Deadline)", icon: <CheckSquare className="w-4 h-4 text-emerald-500" /> },
                                                    { cmd: "/finance", label: "Catat pengeluaran & nota", icon: <CreditCard className="w-4 h-4 text-amber-500" /> },
                                                    { cmd: "/report", label: "Laporan harian / progress DCR", icon: <FileText className="w-4 h-4 text-blue-500" /> },
                                                    { cmd: "/upload", label: "Upload dokumen / 3D Model SKP", icon: <Upload className="w-4 h-4 text-purple-500" /> },
                                                    { cmd: "/project", label: "Bikin proyek baru", icon: <FolderKanban className="w-4 h-4 text-sky-500" /> },
                                                ].filter(s => s.cmd.toLowerCase().includes(channelMessageText.toLowerCase()) || channelMessageText === "/").map((s) => (
                                                    <button
                                                        key={s.cmd}
                                                        onClick={() => {
                                                            setChannelMessageText(`${s.cmd} `);
                                                            setShowSlashMenu(false);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition-colors"
                                                    >
                                                        <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 shrink-0">
                                                            {s.icon}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-[13px] font-bold text-neutral-900 dark:text-white font-mono">
                                                                {s.cmd}
                                                            </div>
                                                            <div className="text-[11px] text-neutral-500 truncate">
                                                                {s.label}
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setChannelMessageText("/");
                                                setShowSlashMenu(true);
                                            }}
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
                                                placeholder={`Message #${currentChannel.code}`}
                                                value={channelMessageText}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setChannelMessageText(val);
                                                    if (val.startsWith("/")) {
                                                        setShowSlashMenu(true);
                                                    } else {
                                                        setShowSlashMenu(false);
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && channelMessageText.trim()) {
                                                        handleSend(channelMessageText.trim());
                                                        setChannelMessageText("");
                                                        setShowSlashMenu(false);
                                                    }
                                                }}
                                                className="flex-1 bg-transparent border-none outline-none text-[14px] text-neutral-900 dark:text-white placeholder:text-neutral-400 py-1"
                                            />
                                            <button
                                                onClick={() => {
                                                    if (channelMessageText.trim()) {
                                                        handleSend(channelMessageText.trim());
                                                        setChannelMessageText("");
                                                        setShowSlashMenu(false);
                                                    }
                                                }}
                                                disabled={!channelMessageText.trim()}
                                                className={clsx(
                                                    "w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0",
                                                    channelMessageText.trim()
                                                        ? "bg-[#0A84FF] text-white shadow-sm hover:bg-blue-600 active:scale-90"
                                                        : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
                                                )}
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* VIEW C: Tasks */}
                    {navMode === "tasks" && (
                        <TasksView feedItems={feedItems} />
                    )}

                    {/* VIEW D: Inbox */}
                    {navMode === "inbox" && (
                        <InboxView feedItems={feedItems} />
                    )}

                    {/* VIEW E: Workspace Modules */}
                    {navMode === "workspace_module" && (
                        <WorkspaceModuleView selectedModule={selectedModule} />
                    )}

                </div>

                {/* =========================================================
                    COLUMN 3: RIGHT PANEL (Operational Activity)
                ========================================================= */}
                <OperationalActivityPanel
                    activeThreadMessage={activeThreadMessage}
                    setActiveThreadMessage={setActiveThreadMessage}
                    selectedItem={selectedItem}
                    setSelectedItem={setSelectedItem}
                    currentChannel={currentChannel}
                    navMode={navMode}
                    selectedModule={selectedModule}
                    feedItems={feedItems}
                    currentChannelFeed={currentChannelFeed}
                    selectedChannelCode={selectedChannelCode}
                    isLoadingFeed={isLoadingFeed}
                    loadFeed={loadFeed}
                />

            </div>

            {/* All Projects Modal */}
            <AllProjectsModal
                isOpen={showAllProjectsModal}
                onClose={() => setShowAllProjectsModal(false)}
                projectChannels={projectChannels}
                setNavMode={setNavMode}
                setSelectedChannelCode={setSelectedChannelCode}
                setActiveChannelSubTab={setActiveChannelSubTab}
                setIsChannelHeaderScrolled={setIsChannelHeaderScrolled}
            />
        </div>
    );
}
