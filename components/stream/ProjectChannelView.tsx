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
    CheckCircle2
} from "lucide-react";
import type { FeedItem } from "@/lib/stream/types";
import { fetchAllProjects } from "@/lib/api/projects";
import type { Project } from "@/types/project";

interface ProjectChannelViewProps {
    feedItems: FeedItem[];
    onSendProjectMessage?: (channelCode: string, text: string) => void;
}

type ProjectSubTab = "overview" | "chat" | "files" | "activity" | "tracking" | "more";

export default function ProjectChannelView({ feedItems, onSendProjectMessage }: ProjectChannelViewProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [selectedChannelCode, setSelectedChannelCode] = useState<string>("000-general");

    // Default sub-tab is directly set to 'chat' as requested!
    const [activeSubTab, setActiveSubTab] = useState<ProjectSubTab>("chat");

    const [channelMessageText, setChannelMessageText] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

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
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent min-w-0">
                {/* Channel Header Bar (Channel Name + Requested Sub-tabs: Overview · Chat · Files · Activity · Tracking · More) */}
                <div className="shrink-0 h-14 px-5 flex items-center justify-between border-b border-neutral-200/40 dark:border-neutral-800/40 bg-white/10 dark:bg-neutral-900/10 backdrop-blur-xl">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-1 text-[15px] font-bold text-neutral-900 dark:text-white font-mono shrink-0">
                            <Hash className="w-4 h-4 text-blue-600" />
                            <span>{currentChannel.code}</span>
                        </div>
                        <span className="text-neutral-300 dark:text-neutral-700 hidden sm:inline">|</span>
                        <span className="text-[13px] text-neutral-500 dark:text-neutral-400 font-medium truncate hidden sm:inline">
                            {currentChannel.name} ({currentChannel.city})
                        </span>
                    </div>

                    {/* Sub-tabs Header Bar (Overview · Chat · Files · Activity · Tracking · More) */}
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1 shrink-0">
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
                        <SubTabButton
                            active={activeSubTab === "more"}
                            onClick={() => setActiveSubTab("more")}
                            icon={<MoreHorizontal className="w-3.5 h-3.5" />}
                            label="More"
                        />
                    </div>
                </div>

                {/* Sub-tab Body Content */}
                <div className="flex-1 h-full overflow-y-auto p-6 scrollbar-hide space-y-6">

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
                        <div className="space-y-3">
                            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                                All Project Documents & Models
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FileCard name={`20250809_${currentChannel.projectCode}_LT 3.skp`} size="BIN / SketchUp" />
                                <FileCard name={`20250809_${currentChannel.projectCode}_LT 4.skp`} size="BIN / SketchUp" />
                                <FileCard name={`DCR_Daily_Report_${currentChannel.projectCode}.pdf`} size="PDF Document" />
                                <FileCard name={`RAB_Final_Approved_${currentChannel.projectCode}.xlsx`} size="Excel Spreadsheet" />
                            </div>
                        </div>
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

function SubTabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all whitespace-nowrap",
                active
                    ? "bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50"
            )}
        >
            {icon}
            <span>{label}</span>
        </button>
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
