"use client";

import React, { useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import {
    Hash,
    Search,
    MessageSquare,
    FileText,
    Activity,
    Paperclip,
    Send,
    File,
    LayoutGrid,
    TrendingUp,
    MoreHorizontal,
    Building2,
    Calendar,
    MapPin,
    CheckCircle2,
    Plus,
    ListFilter,
    List,
    X,
    ChevronDown,
} from "lucide-react";
import { useTheme } from "next-themes";
import { SubTabButton } from "./stream-nav-helpers";
import ProjectFilesTab, { ProjectFileItem } from "./ProjectFilesTab";
import type { FeedItem } from "@/lib/stream/types";
import { fetchAllProjects } from "@/lib/api/projects";
import type { Project } from "@/types/project";

interface ProjectChannelViewProps {
    feedItems: FeedItem[];
    onSendProjectMessage?: (channelCode: string, text: string) => void;
}

type ProjectSubTab = "overview" | "chat" | "files" | "activity" | "tracking" | "more";

export default function ProjectChannelView({ feedItems, onSendProjectMessage }: ProjectChannelViewProps) {
    const { theme } = useTheme();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [selectedChannelCode, setSelectedChannelCode] = useState<string>("000-general");

    // Default sub-tab is directly set to 'chat' as requested!
    const [activeSubTab, setActiveSubTab] = useState<ProjectSubTab>("chat");

    const [channelMessageText, setChannelMessageText] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Files Tab state
    const [customChannelFiles, setCustomChannelFiles] = useState<Record<string, ProjectFileItem[]>>({});
    const [fileSearchQuery, setFileSearchQuery] = useState("");
    const [isFileSearchOpen, setIsFileSearchOpen] = useState(false);
    const [fileViewMode, setFileViewMode] = useState<"grid" | "table">("grid");
    const [selectedFileCategory, setSelectedFileCategory] = useState<string>("all");
    const [isFileFilterOpen, setIsFileFilterOpen] = useState(false);
    const [isMoreTabsOpen, setIsMoreTabsOpen] = useState(false);
    const [isToolsPopoverOpen, setIsToolsPopoverOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<ProjectFileItem | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleManualFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newItems: ProjectFileItem[] = Array.from(files).map((f, i) => {
            const ext = f.name.split('.').pop()?.toLowerCase() || '';
            let type: ProjectFileItem['type'] = 'other';
            let typeName = 'File';
            if (['skp'].includes(ext)) { type = 'skp'; typeName = 'SketchUp 3D Model'; }
            else if (['pln'].includes(ext)) { type = 'pln'; typeName = 'Archicad Model'; }
            else if (['pdf'].includes(ext)) { type = 'pdf'; typeName = 'PDF Document'; }
            else if (['dwg', 'dxf'].includes(ext)) { type = 'dwg'; typeName = 'AutoCAD Drawing'; }
            else if (['xlsx', 'xls', 'csv'].includes(ext)) { type = 'excel'; typeName = 'Excel Spreadsheet'; }
            else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) { type = 'image'; typeName = 'Image'; }

            const formattedSize = (f.size / (1024 * 1024)).toFixed(1) + ' MB';

            return {
                id: `manual-${Date.now()}-${i}`,
                name: f.name,
                size: formattedSize,
                type,
                typeName,
                uploadedBy: 'Zulfikar Adhitya',
                uploadedAt: 'Just now',
                source: 'manual',
            };
        });

        setCustomChannelFiles(prev => ({
            ...prev,
            [selectedChannelCode]: [...newItems, ...(prev[selectedChannelCode] || [])]
        }));

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDeleteCustomFile = (fileId: string) => {
        setCustomChannelFiles(prev => ({
            ...prev,
            [selectedChannelCode]: (prev[selectedChannelCode] || []).filter(f => f.id !== fileId)
        }));
    };

    // Load real projects from Supabase database
    const loadProjects = useCallback(async () => {
        try {
            setIsLoadingProjects(true);
            const data = await fetchAllProjects();
            setProjects(data);
            if (data.length > 0) {
                const firstSlug = `${data[0].projectNumber || "000"}-${(data[0].projectCode || "PRJ").toLowerCase()}`;
                setSelectedChannelCode(firstSlug);
            }
        } catch (err) {
            console.error("Failed to load projects from DB:", err);
        } finally {
            setIsLoadingProjects(false);
        }
    }, []);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    // Format channel list with General + Real DB Projects
    const channelList = [
        {
            id: "general",
            code: "000-general",
            name: "General Workspace Updates",
            city: "All Sites",
            projectNo: "000",
            projectCode: "GENERAL"
        },
        ...projects.map(p => ({
            id: p.id,
            code: `${p.projectNumber || "000"}-${(p.projectCode || "PRJ").toLowerCase()}`,
            name: p.projectName,
            city: p.location?.city || p.location?.province || "Site",
            projectNo: p.projectNumber || "000",
            projectCode: p.projectCode || "PRJ",
            raw: p
        }))
    ];

    const currentChannel = channelList.find(c => c.code === selectedChannelCode) || channelList[0];

    // Filter feed items for current channel
    const channelFeed = feedItems.filter(item => {
        if (currentChannel.code === "000-general") return true;
        const text = (item.title + " " + item.subtitle + " " + (item.rawInput || "")).toLowerCase();
        const codeClean = currentChannel.projectCode.toLowerCase();
        const nameClean = currentChannel.name.toLowerCase();
        return text.includes(codeClean) || text.includes(nameClean) || text.includes(currentChannel.code);
    });

    const handleSendMessage = () => {
        if (!channelMessageText.trim()) return;
        onSendProjectMessage?.(currentChannel.code, channelMessageText.trim());
        setChannelMessageText("");
    };

    const filteredChannels = channelList.filter(c =>
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-row h-full overflow-hidden bg-transparent min-h-0">
            {/* =========================================================
                COLUMN 1: Left Channel Sidebar (Independent Scroll)
            ========================================================= */}
            <div className="w-64 sm:w-72 shrink-0 border-r border-neutral-200/40 dark:border-neutral-800/40 bg-white/10 dark:bg-neutral-900/10 backdrop-blur-xl flex flex-col h-full overflow-hidden">
                {/* Channels Search Header */}
                <div className="p-3.5 border-b border-neutral-200/40 dark:border-neutral-800/40 space-y-2 shrink-0">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                            Project Channels
                        </span>
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">
                            {isLoadingProjects ? "..." : channelList.length}
                        </span>
                    </div>

                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                        <input
                            type="text"
                            placeholder="Find channel or project..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-[12px] bg-neutral-100/60 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/40 outline-none focus:border-blue-500 text-neutral-800 dark:text-neutral-200"
                        />
                    </div>
                </div>

                {/* Independent Scrollable Channels List */}
                <div className="flex-1 h-full overflow-y-auto p-2 space-y-0.5 scrollbar-hide">
                    {isLoadingProjects ? (
                        <div className="p-4 text-center text-[12px] text-neutral-400 animate-pulse">
                            Loading projects from database...
                        </div>
                    ) : (
                        filteredChannels.map((channel) => {
                            const isSelected = channel.code === selectedChannelCode;

                            return (
                                <button
                                    key={channel.code}
                                    onClick={() => setSelectedChannelCode(channel.code)}
                                    className={clsx(
                                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all",
                                        isSelected
                                            ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20"
                                            : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/50 font-medium"
                                    )}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Hash className={clsx("w-4 h-4 shrink-0", isSelected ? "text-white" : "text-neutral-400")} />
                                        <span className="text-[13px] truncate tracking-tight font-mono">
                                            {channel.code}
                                        </span>
                                    </div>

                                    <span className={clsx(
                                        "text-[10px] truncate max-w-[80px] font-medium opacity-80",
                                        isSelected ? "text-white/80" : "text-neutral-400"
                                    )}>
                                        {channel.city}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* =========================================================
                COLUMN 2: Center Channel Workspace (Independent Scroll)
            ========================================================= */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent min-w-0 relative">
                {/* Channel Header Bar (Channel Name + Requested Sub-tabs: Overview · Chat · Files · Activity · Tracking · More) */}
                <div className="absolute top-3 left-4 right-4 z-30 pointer-events-none">
                    <div
                        style={{
                            background: theme === "dark"
                                ? "linear-gradient(180deg, rgba(24,24,27,0.92) 0%, rgba(15,15,18,0.85) 100%)"
                                : "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(245,245,250,0.85) 100%)",
                            backdropFilter: "blur(32px) saturate(180%)",
                            WebkitBackdropFilter: "blur(32px) saturate(180%)",
                            border: theme === "dark"
                                ? "1px solid rgba(255,255,255,0.12)"
                                : "1px solid rgba(255,255,255,0.8)",
                            boxShadow: theme === "dark"
                                ? "0 12px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.08)"
                                : "0 12px 40px rgba(0,0,0,0.08), inset 0 1px 0.5px rgba(255,255,255,0.9)",
                        }}
                        className="h-13 sm:h-14 px-2.5 sm:px-3 flex items-center justify-between transition-all duration-300 w-full rounded-full gap-2 shadow-lg pointer-events-auto"
                    >
                        {/* Left Badge: Code ONLY (No project name on any tab) */}
                        <div className="flex items-center gap-2 min-w-0 shrink-0">
                            <div className="h-9 flex items-center gap-1.5 px-3 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs font-mono shrink-0">
                                <Hash className="w-3.5 h-3.5" />
                                <span>{currentChannel.code}</span>
                            </div>
                        </div>

                    {/* Sub-tabs Header Bar with h-9 Uniform Height */}
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1 min-w-0 shrink">
                        <SubTabButton
                            active={activeSubTab === "overview"}
                            onClick={() => setActiveSubTab("overview")}
                            icon={<LayoutGrid className="w-3.5 h-3.5" />}
                            label="Overview"
                        />
                        <SubTabButton
                            active={activeSubTab === "chat"}
                            onClick={() => setActiveSubTab("chat")}
                            icon={<MessageSquare className="w-3.5 h-3.5" />}
                            label="Chat"
                        />
                        <SubTabButton
                            active={activeSubTab === "files"}
                            onClick={() => setActiveSubTab("files")}
                            icon={<FileText className="w-3.5 h-3.5" />}
                            label="Files"
                        />
                        <SubTabButton
                            active={activeSubTab === "activity"}
                            onClick={() => setActiveSubTab("activity")}
                            icon={<Activity className="w-3.5 h-3.5" />}
                            label="Activity"
                        />
                        <SubTabButton
                            active={activeSubTab === "tracking"}
                            onClick={() => setActiveSubTab("tracking")}
                            icon={<TrendingUp className="w-3.5 h-3.5" />}
                            label="Tracking"
                        />
                    </div>

                    {/* Right Action Tools: Primary Plus Upload Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="h-9 w-9 rounded-full bg-[#0A84FF] hover:bg-blue-600 active:scale-90 text-white flex items-center justify-center shadow-md transition-all shrink-0 cursor-pointer"
                            title="Upload File to Project"
                        >
                            <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Hidden File Input for Manual Uploads */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleManualFileUpload}
                multiple
                className="hidden"
            />

                {/* Sub-tab Body Content */}
                <div className="flex-1 h-full overflow-y-auto pt-20 md:pt-24 px-6 pb-6 scrollbar-hide space-y-6">

                    {/* SUB-TAB: OVERVIEW */}
                    {activeSubTab === "overview" && (
                        <div className="space-y-4 max-w-3xl">
                            <div className="p-5 rounded-[22px] bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl border border-white/60 dark:border-neutral-800/40 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-blue-600 uppercase bg-blue-500/10 px-3 py-1 rounded-full">
                                        Project Summary
                                    </span>
                                    <span className="text-[12px] font-medium text-neutral-400 font-mono">
                                        #{currentChannel.code}
                                    </span>
                                </div>
                                <h2 className="text-[20px] font-bold text-neutral-900 dark:text-white">
                                    {currentChannel.name}
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                                    <div className="p-3 rounded-xl bg-white/50 dark:bg-neutral-800/50">
                                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Location</span>
                                        <p className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">{currentChannel.city}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/50 dark:bg-neutral-800/50">
                                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Code</span>
                                        <p className="text-[13px] font-bold text-neutral-800 dark:text-neutral-200 mt-0.5 font-mono">{currentChannel.projectCode}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/50 dark:bg-neutral-800/50">
                                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Status</span>
                                        <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Active</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SUB-TAB: CHAT (Default Tab) */}
                    {activeSubTab === "chat" && (
                        <>
                            {/* Welcome Banner */}
                            <div className="p-5 rounded-[22px] bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl border border-white/60 dark:border-neutral-800/40 shadow-sm space-y-2">
                                <div className="flex items-center gap-2 text-blue-600 font-bold text-[14px]">
                                    <Hash className="w-5 h-5" />
                                    <span className="font-mono">#{currentChannel.code}</span>
                                </div>
                                <h2 className="text-[18px] font-bold text-neutral-900 dark:text-white">
                                    {currentChannel.name}
                                </h2>
                                <p className="text-[12px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                    Official channel for project operational updates, drawings, DCR daily reports, and material logs.
                                </p>
                            </div>

                            {/* Attached Files */}
                            <div className="space-y-2">
                                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                                    Project Files & Models
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <FileCard name={`20250809_${currentChannel.projectCode}_LT 3.skp`} size="BIN / SketchUp" />
                                    <FileCard name={`20250809_${currentChannel.projectCode}_LT 4.skp`} size="BIN / SketchUp" />
                                </div>
                            </div>

                            {/* Stream Activities */}
                            <div className="space-y-3 pt-2">
                                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                                    Recent Stream Activities
                                </span>
                                {channelFeed.length > 0 ? (
                                    channelFeed.map((item) => (
                                        <div
                                            key={item.id}
                                            className="p-4 rounded-2xl bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl border border-white/60 dark:border-neutral-800/40 space-y-1"
                                        >
                                            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-medium">
                                                <span>{item.title}</span>
                                                <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">
                                                {item.subtitle || item.description || item.rawInput}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 text-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-400 text-[12px]">
                                        Belum ada aktivitas spesifik untuk #{currentChannel.code}. Ketik di input bawah untuk menambahkan update!
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* SUB-TAB: FILES */}
                    {activeSubTab === "files" && (
                        <ProjectFilesTab
                            channelCode={currentChannel.code}
                            channelName={currentChannel.name}
                            customFiles={customChannelFiles[selectedChannelCode] || []}
                            onDeleteFile={handleDeleteCustomFile}
                            onSelectFile={(file) => setSelectedFile(file)}
                            selectedFileId={selectedFile?.id}
                        />
                    )}

                    {/* SUB-TAB: ACTIVITY */}
                    {activeSubTab === "activity" && (
                        <div className="space-y-3">
                            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                                Activity Audit Log
                            </span>
                            {channelFeed.map((item) => (
                                <div key={item.id} className="p-3.5 rounded-2xl bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl border border-white/60 dark:border-neutral-800/40 text-[13px] font-medium">
                                    <span className="text-blue-600 font-bold">{item.title}</span> — {item.subtitle || item.description}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* SUB-TAB: TRACKING */}
                    {activeSubTab === "tracking" && (
                        <div className="p-5 rounded-[22px] bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl border border-white/60 dark:border-neutral-800/40 space-y-3">
                            <h3 className="text-[15px] font-bold text-neutral-900 dark:text-white">Project Progress Tracking</h3>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-3 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full w-[65%]" />
                                </div>
                                <span className="text-[14px] font-bold text-blue-600">65%</span>
                            </div>
                        </div>
                    )}

                    {/* SUB-TAB: MORE */}
                    {activeSubTab === "more" && (
                        <div className="p-5 rounded-[22px] bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl border border-white/60 dark:border-neutral-800/40 text-[13px] font-medium text-neutral-500">
                            More project settings and permissions configuration.
                        </div>
                    )}

                </div>

                {/* Bottom Channel Message Input Bar (Always active on Chat tab) */}
                {activeSubTab === "chat" && (
                    <div className="shrink-0 p-4 border-t border-neutral-200/40 dark:border-neutral-800/40 bg-transparent">
                        <div className="flex items-center gap-2 p-2 rounded-[24px] bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl border border-white/60 dark:border-neutral-800/40 shadow-sm focus-within:border-blue-500">
                            <button className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors">
                                <Paperclip className="w-4 h-4" />
                            </button>
                            <input
                                type="text"
                                placeholder={`Message #${currentChannel.code}`}
                                value={channelMessageText}
                                onChange={(e) => setChannelMessageText(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                className="flex-1 bg-transparent border-none outline-none text-[14px] text-neutral-900 dark:text-white placeholder:text-neutral-400"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!channelMessageText.trim()}
                                className={clsx(
                                    "p-2 rounded-full transition-all",
                                    channelMessageText.trim()
                                        ? "bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-90"
                                        : "bg-neutral-200/50 dark:bg-neutral-800/50 text-neutral-400 cursor-not-allowed"
                                )}
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}



function FileCard({ name, size }: { name: string; size: string }) {
    return (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl border border-white/60 dark:border-neutral-800/40">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                <File className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
                <h4 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 truncate font-mono">
                    {name}
                </h4>
                <p className="text-[10px] text-neutral-400 font-medium">{size}</p>
            </div>
        </div>
    );
}
