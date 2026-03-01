"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    List,
    Zap,
    Clock,
    Undo2,
    CheckCircle2,
    Menu,
    Plus,
    CreditCard,
    Target,
    Search,
    Users,
    Calendar,
    ListFilter,
    Check,
    UploadCloud,
    ChevronDown,
    X
} from "lucide-react";
import FrostedGlassFilter from "@/components/layout/FrostedGlassFilter";
import { fetchAllProjects, fetchProjectWBS } from "@/lib/api/projects";
import { fetchAllActions, createAction } from "@/lib/api/actions";
import { Project, WBSItem } from "@/types/project";
import { ActionStatus, ActionPriority } from "@/types/task";

// --- MOCK DATA & TYPES ---
type StatusType = ActionStatus;
type PriorityType = ActionPriority;

interface ActionItem {
    id: string;
    title: string;
    projectCode: string;
    projectName: string;
    date: string;
    status: StatusType;
    priority: PriorityType;
    icon: "target" | "creditCard" | "clock";
    avatars: string[];
    theme: "pink" | "orange" | "blue" | "gray";
    customAction?: string;
    customActionIcon?: React.ReactNode;
}

const TABS = [
    { id: "all", label: "All", icon: List },
    { id: "urgent", label: "Urgent", icon: Zap },
    { id: "pending", label: "Pending", icon: Clock },
    { id: "returned", label: "Returned", icon: Undo2 },
    { id: "done", label: "Done", icon: CheckCircle2 },
];

const EXTENDED_MOCK_ACTIONS: ActionItem[] = []; // Removed dummy data

// --- HELPER COMPONENTS ---

const getThemeStyles = (theme: ActionItem["theme"]) => {
    switch (theme) {
        case "pink":
            return {
                bg: "bg-[#fcebef]",
                iconBg: "bg-[#eb5275]", // Solid red bg for icon circle
                iconColor: "text-white",
            };
        case "orange":
            return {
                bg: "bg-[#fdf4e8]",
                iconBg: "bg-[#f29f4b]",
                iconColor: "text-white",
            };
        case "blue":
            return {
                bg: "bg-[#eef3fc]",
                iconBg: "bg-[#5485ea]",
                iconColor: "text-white",
            };
        default:
            return {
                bg: "bg-[#f4f4f5]",
                iconBg: "bg-[#71717a]",
                iconColor: "text-white",
            };
    }
};

const getStatusStyles = (status: StatusType, priority: PriorityType) => {
    let statusBadge = "";
    if (status === "PENDING") statusBadge = "bg-[#d4e1f8] text-[#5485ea] font-bold";
    else if (status === "APPROVED") statusBadge = "bg-[#cfead4] text-[#4cb05f] font-bold";
    else if (status === "REJECTED") statusBadge = "bg-[#f7d4dc] text-[#eb5275] font-bold";

    let priorityBadge = "";
    if (priority === "URGENT") priorityBadge = "bg-[#f7d4dc] text-[#eb5275] font-bold";
    else if (priority === "HIGH") priorityBadge = "bg-[#f7d4dc] text-[#eb5275] font-bold";
    else if (priority === "MEDIUM") priorityBadge = "bg-[#fde2c9] text-[#f29f4b] font-bold";
    else priorityBadge = "bg-[#e4e4e7] text-[#71717a] font-bold";

    return { statusBadge, priorityBadge };
};

const ActionDetailModal = ({
    action,
    isOpen,
    onClose,
}: {
    action: ActionItem | null;
    isOpen: boolean;
    onClose: () => void;
}) => {
    if (!isOpen || !action) return null;

    const tStyles = getThemeStyles(action.theme);
    const { statusBadge, priorityBadge } = getStatusStyles(action.status, action.priority);
    const IconComponent =
        action.icon === "target" ? Target : action.icon === "creditCard" ? CreditCard : Clock;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full sm:w-[400px] sm:rounded-3xl bg-[#f8f9fa] rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom flex flex-col max-h-[90dvh]">
                {/* Grabber for Mobile */}
                <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-12 h-1.5 bg-black/10 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pt-4 pb-4 flex items-center justify-between border-b border-black/5">
                    <div className="flex gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full tracking-wider uppercase ${statusBadge}`}>
                            {action.status}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full tracking-wider uppercase ${priorityBadge}`}>
                            {action.priority}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
                    >
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="px-6 py-6 overflow-y-auto">
                    {/* Main Info */}
                    <div className="flex gap-4 mb-8">
                        <div className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center opacity-80 ${tStyles.iconBg}`}>
                            <IconComponent size={28} className={`opacity-100 ${tStyles.iconColor}`} />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-[22px] font-bold text-gray-900 leading-tight mb-2">
                                {action.title}
                            </h2>
                            <div className="flex items-center gap-2">
                                <span className="bg-black/5 text-gray-500 text-[11px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                                    {action.projectCode}
                                </span>
                                <span className="text-[14px] text-gray-500 font-medium">
                                    {action.projectName}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="bg-white rounded-2xl p-4 border border-black/5 mb-6">
                        <div className="grid border-b border-black/5 pb-4 mb-4 gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-500 text-[13px] font-medium">
                                    <Calendar size={16} /> Date Assigned
                                </div>
                                <div className="text-[14px] font-bold text-gray-900">{action.date}</div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-gray-500 text-[13px] font-medium">
                                <Users size={16} /> Assignees
                            </div>
                            <div className="flex items-center">
                                {action.avatars.map((av, idx) => (
                                    <div
                                        key={idx}
                                        className={`w-[28px] h-[28px] rounded-full text-[11px] font-bold flex items-center justify-center border-2 border-white shadow-sm ${av.includes("+") ? "bg-gray-100 text-gray-600" : "bg-gradient-to-br from-white to-gray-100 text-gray-800"
                                            } ${idx > 0 ? "-ml-2" : ""}`}
                                    >
                                        {av}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Action Specific Info */}
                    {action.customAction && (
                        <div className="mb-6 bg-[#fcfcfd] rounded-2xl p-4 border border-blue-100 flex items-center justify-between">
                            <div className="text-[13px] font-medium text-gray-600">Pending Action type</div>
                            <div className="flex items-center gap-1.5 text-[14px] font-bold text-gray-900">
                                {action.customActionIcon}
                                {action.customAction}
                            </div>
                        </div>
                    )}

                    {/* Description Placeholder */}
                    <div className="mb-6">
                        <h4 className="text-[15px] font-bold text-gray-900 mb-2">Instructions</h4>
                        <p className="text-[14px] text-gray-500 leading-relaxed">
                            Please review the attached material and make the necessary decisions to proceed with the action item workflow.
                        </p>
                    </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="p-4 bg-white/80 backdrop-blur-md border-t border-black/5 flex gap-3 pb-8 sm:pb-4">
                    {action.status === "PENDING" && (
                        <>
                            <button className="flex-1 bg-[#fef1f2] hover:bg-[#fde8eb] text-[#e03131] rounded-full py-4 font-bold text-[15px] transition-colors border border-[#fae2e5]">
                                Reject
                            </button>
                            <button className="flex-1 bg-gray-900 hover:bg-black text-white rounded-full py-4 font-bold text-[15px] transition-colors">
                                Approve / Send
                            </button>
                        </>
                    )}
                    {action.status !== "PENDING" && (
                        <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full py-4 font-bold text-[15px] transition-colors">
                            View Log
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const ActionCard = ({ action }: { action: ActionItem }) => {
    const tStyles = getThemeStyles(action.theme);
    const { statusBadge, priorityBadge } = getStatusStyles(action.status, action.priority);

    const IconComponent =
        action.icon === "target" ? Target : action.icon === "creditCard" ? CreditCard : Clock;

    return (
        <div className={`p-4 rounded-[20px] ${tStyles.bg} flex flex-col gap-3 relative shadow-sm mb-4`}>
            {/* Top row: Icon + Rest */}
            <div className="flex gap-4">
                {/* Left Icon */}
                <div
                    className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center opacity-70 ${tStyles.iconBg}`}
                >
                    <IconComponent size={20} className={`opacity-100 ${tStyles.iconColor}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                    {/* Title */}
                    <h3 className="text-[17px] font-bold text-gray-900 leading-tight pr-[65px]">
                        {action.title}
                    </h3>

                    {/* Project */}
                    <div className="flex items-center gap-2 mt-2">
                        <span className="bg-black/5 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                            {action.projectCode}
                        </span>
                        <span className="text-[13px] text-gray-500 font-medium truncate">
                            {action.projectName}
                        </span>
                    </div>

                    {/* Date & Bottom Info */}
                    <div className="flex items-center justify-between mt-6">
                        <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-400">
                            <span className="opacity-60 flex border border-gray-300 text-[10px] bg-transparent rounded-[4px] items-center justify-center p-[2px]">
                                <Menu size={10} />
                            </span>
                            <span>{action.date}</span>
                        </div>

                        {action.customAction && (
                            <div className="flex items-center gap-1.5 pr-[45px] text-[12px] font-bold text-gray-900">
                                {action.customActionIcon}
                                {action.customAction}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Status Badges (Absolute positioned for top right corner style) */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
                    <span className={`text-[9px] px-2 py-0.5 rounded-md tracking-wider uppercase ${statusBadge}`}>
                        {action.status}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-md tracking-wider uppercase ${priorityBadge}`}>
                        {action.priority}
                    </span>
                </div>
            </div>

            {/* Avatars */}
            <div className="absolute bottom-4 right-4 flex items-center">
                {action.avatars.map((av, idx) => (
                    <div
                        key={idx}
                        className={`w-[26px] h-[26px] rounded-full text-[10px] font-bold flex items-center justify-center border-2 shadow-sm ${av.includes("+")
                            ? "bg-gray-100 text-gray-600 border-white"
                            : "bg-black/10 text-gray-800 border-transparent backdrop-blur-sm"
                            } ${idx > 0 ? "-ml-2" : ""}`}
                        style={
                            !av.includes("+")
                                ? {
                                    // subtle gradient or plain bg depending on preference
                                }
                                : {}
                        }
                    >
                        {av}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function ActionPage() {
    const [actions, setActions] = useState<ActionItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [isScrolled, setIsScrolled] = useState(false);
    const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);

    // Database Projects
    const [dbProjects, setDbProjects] = useState<Project[]>([]);

    useEffect(() => {
        async function loadData() {
            const [projectsData, actionsData] = await Promise.all([
                fetchAllProjects(),
                fetchAllActions()
            ]);
            setDbProjects(projectsData);

            const mappedActions: ActionItem[] = actionsData.map(a => ({
                id: a.id,
                title: a.title,
                projectCode: a.projectCode || "UNK",
                projectName: a.projectName || "Unknown Project",
                date: a.deadlineDate,
                status: a.status as StatusType,
                priority: a.priority as PriorityType,
                icon: "target",
                avatars: a.reviewers?.length ? a.reviewers : ["U"],
                theme: "blue", // Setting default blue for connected items
            }));
            setActions(mappedActions);
            setIsLoading(false);
        }
        loadData();
    }, []);

    // Filter & Add State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Filter form state
    const [filterProject, setFilterProject] = useState<string>("All");
    const [filterDate, setFilterDate] = useState<string>("All");

    // Add form state
    const [newActionTitle, setNewActionTitle] = useState("");
    const [newActionProject, setNewActionProject] = useState("PRG");
    const [newActionWBS, setNewActionWBS] = useState("");
    const [newActionDeadlineDate, setNewActionDeadlineDate] = useState(new Date().toISOString().split('T')[0]);
    const [newActionDeadlineTime, setNewActionDeadlineTime] = useState("");
    const [newActionStatus, setNewActionStatus] = useState<StatusType>("PENDING");
    const [newActionPriority, setNewActionPriority] = useState<PriorityType>("MEDIUM");
    const [newActionAssignees, setNewActionAssignees] = useState<string[]>([]);
    const [newActionDescription, setNewActionDescription] = useState("");
    const [newActionFile, setNewActionFile] = useState<File | null>(null);

    // WBS List state
    const [wbsList, setWbsList] = useState<WBSItem[]>([]);

    // Fetch WBS when project changes
    useEffect(() => {
        async function loadWBS() {
            if (!newActionProject) return;
            // find the project id from the code
            const proj = dbProjects.find(p => p.projectCode === newActionProject);
            if (proj) {
                const wbs = await fetchProjectWBS(proj.id);
                setWbsList(wbs);
                if (wbs.length > 0) {
                    setNewActionWBS(wbs[0].wbsCode || "");
                } else {
                    setNewActionWBS("");
                }
            }
        }
        loadWBS();
    }, [newActionProject, dbProjects]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 20);
    };

    const handleAddAction = async () => {
        if (!newActionTitle.trim()) return;

        const proj = dbProjects.find(p => p.projectCode === newActionProject);
        if (!proj) return;

        const newActionDbPayload = {
            title: newActionTitle,
            description: newActionDescription,
            projectId: proj.id,
            wbsId: newActionWBS || null,
            sourceTaskId: null,
            deadlineDate: newActionDeadlineDate,
            deadlineTime: newActionDeadlineTime || null,
            status: newActionStatus,
            priority: newActionPriority,
            requestedBy: null // To be replaced with actual user logic if needed
        };

        const createdAction = await createAction(newActionDbPayload, newActionAssignees);

        if (createdAction) {
            const newAction: ActionItem = {
                id: createdAction.id,
                title: createdAction.title,
                projectCode: createdAction.projectCode || proj.projectCode,
                projectName: createdAction.projectName || proj.projectName,
                date: createdAction.deadlineDate,
                status: createdAction.status as StatusType,
                priority: createdAction.priority as PriorityType,
                icon: "target",
                avatars: newActionAssignees.length > 0 ? newActionAssignees : ["U"],
                theme: "blue",
            };

            setActions([newAction, ...actions]);
        }
        setNewActionTitle("");
        setNewActionDescription("");
        setNewActionAssignees([]);
        setNewActionFile(null);
        setNewActionDeadlineTime("");
        setIsAddOpen(false);
    };

    const filteredActions = actions.filter((a) => {
        // 1. Tab Filter
        let tabMatch = false;
        if (activeTab === "all") tabMatch = true;
        else if (activeTab === "pending" && a.status === "PENDING") tabMatch = true;
        else if (activeTab === "urgent" && a.priority === "URGENT") tabMatch = true;
        // (Other tabs as needed...)

        // 2. Project Filter
        let projMatch = filterProject === "All" || a.projectCode === filterProject;

        // 3. Date Filter (Simplified mock logic)
        let dateMatch = filterDate === "All" || a.date === filterDate;

        return tabMatch && projMatch && dateMatch;
    });

    return (
        <div
            className="h-[100dvh] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-[#f8f9fa] pb-24 relative"
            onScroll={handleScroll}
        >
            <FrostedGlassFilter />

            {/* HEADER SECTION - STICKY WITH GLASS EFFECT WHEN SCROLLED */}
            <div
                className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled
                    ? "bg-[#f8f9fa]/70 backdrop-blur-xl border-b border-black/[0.05] pt-6 pb-2"
                    : "bg-[#f8f9fa] pt-8 pb-4"
                    } px-5`}
            >
                {/* Top Header Row */}
                <div className={`flex items-center transition-all duration-300 relative ${isScrolled ? "mb-4" : "mb-6"}`}>
                    {/* Title */}
                    <h1
                        className={`font-bold text-gray-900 tracking-tight transition-all duration-300 ease-in-out origin-left ${isScrolled
                            ? "text-[18px] absolute left-1/2 -translate-x-1/2"
                            : "text-[34px] relative"
                            }`}
                    >
                        Actions
                    </h1>

                    {/* Spacer to push right content when title is not absolute */}
                    {!isScrolled && <div className="flex-1" />}

                    {/* Top Right Action Pills */}
                    <div className={`flex items-center gap-1 p-1 rounded-full shadow-sm border border-black/[0.03] transition-all duration-300 ${isScrolled ? "ml-auto bg-white/40 backdrop-blur-md" : "bg-white"}`}>
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors relative"
                        >
                            <ListFilter size={20} className="text-gray-700" />
                            {(filterProject !== "All" || filterDate !== "All") && (
                                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                            )}
                        </button>
                        <button
                            onClick={() => setIsAddOpen(true)}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                            <Plus size={20} className="text-gray-700" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Filter Menu */}
                <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-5 px-5">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors flex-shrink-0 ${isActive
                                    ? `text-gray-900 font-bold`
                                    : "bg-transparent text-gray-500 font-medium hover:text-gray-700"
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabBadgeActions"
                                        className={`absolute inset-0 rounded-full shadow-sm border border-black/[0.04] ${isScrolled ? "bg-white/60 backdrop-blur-md" : "bg-white"
                                            }`}
                                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                    />
                                )}
                                <div className="relative z-10 flex items-center gap-2">
                                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-gray-900" : "opacity-60"} />
                                    <span className="text-[14px]">{tab.label}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* LIST OR EMPTY STATE */}
            <div className="px-5 mt-2 relative z-0">
                {filteredActions.length > 0 ? (
                    filteredActions.map((action) => (
                        <div key={action.id} onClick={() => setSelectedAction(action)} className="cursor-pointer active:scale-[0.98] transition-transform">
                            <ActionCard action={action} />
                        </div>
                    ))
                ) : (
                    <div className="h-[55vh] flex flex-col items-center justify-center text-center">
                        {activeTab === "all" && (
                            <>
                                <div className="w-24 h-24 bg-[#f8f9fa] rounded-full flex items-center justify-center mb-6 shadow-sm border border-[#f0f0f0]">
                                    <List className="w-10 h-10 text-gray-400 opacity-80" />
                                </div>
                                <h2 className="text-[20px] font-bold text-gray-900 mb-2">Desk is clear!</h2>
                                <p className="text-[14px] font-medium text-gray-500 max-w-[240px] leading-relaxed opacity-80">
                                    No pending actions require your attention across any project.
                                </p>
                            </>
                        )}
                        {activeTab === "urgent" && (
                            <>
                                <div className="w-24 h-24 bg-[#fcebef] rounded-full flex items-center justify-center mb-6 shadow-sm border border-[#f7d4dc]">
                                    <Zap className="w-10 h-10 text-[#eb5275] fill-[#eb5275] opacity-80" />
                                </div>
                                <h2 className="text-[20px] font-bold text-gray-900 mb-2">Phew! No fires.</h2>
                                <p className="text-[14px] font-medium text-gray-500 max-w-[220px] leading-relaxed opacity-80">
                                    There are no urgent actions demanding immediate action.
                                </p>
                            </>
                        )}
                        {activeTab === "pending" && (
                            <>
                                <div className="w-24 h-24 bg-[#eff4fc] rounded-full flex items-center justify-center mb-6 shadow-sm border border-[#e8effa]">
                                    <Clock className="w-10 h-10 text-[#5485ea] opacity-80" />
                                </div>
                                <h2 className="text-[20px] font-bold text-gray-900 mb-2">Nothing pending</h2>
                                <p className="text-[14px] font-medium text-gray-500 max-w-[220px] leading-relaxed opacity-80">
                                    No approvals are currently waiting for your review.
                                </p>
                            </>
                        )}
                        {activeTab === "returned" && (
                            <>
                                <div className="w-24 h-24 bg-[#fdf4e8] rounded-full flex items-center justify-center mb-6 shadow-sm border border-[#fde2c9]">
                                    <Undo2 className="w-10 h-10 text-[#f29f4b] opacity-80" />
                                </div>
                                <h2 className="text-[20px] font-bold text-gray-900 mb-2">Hooray!</h2>
                                <p className="text-[14px] font-medium text-gray-500 max-w-[220px] leading-relaxed opacity-80">
                                    None of your requests were returned for revision or dispute.
                                </p>
                            </>
                        )}
                        {activeTab === "done" && (
                            <>
                                <div className="w-24 h-24 bg-[#eaf5ec] rounded-full flex items-center justify-center mb-6 shadow-sm border border-[#cfead4]">
                                    <CheckCircle2 className="w-10 h-10 text-[#4cb05f] opacity-80" />
                                </div>
                                <h2 className="text-[20px] font-bold text-gray-900 mb-2">Fresh start</h2>
                                <p className="text-[14px] font-medium text-gray-500 max-w-[220px] leading-relaxed opacity-80">
                                    Actions you've completed and archived will appear here.
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ACTION DETAIL MODAL */}
            <ActionDetailModal
                isOpen={!!selectedAction}
                action={selectedAction}
                onClose={() => setSelectedAction(null)}
            />

            {/* FILTER MODAL */}
            {isFilterOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setIsFilterOpen(false)} />
                    <div className="relative w-full sm:w-[400px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom flex flex-col max-h-[90dvh]">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-lg text-gray-900">Filter Actions</h3>
                            <button onClick={() => setIsFilterOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                                <X size={16} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="mb-6">
                                <h4 className="text-sm font-bold text-gray-700 mb-3">Project</h4>
                                <select
                                    value={filterProject}
                                    onChange={(e) => setFilterProject(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all font-medium text-gray-700 appearance-none"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: `2.5rem` }}
                                >
                                    <option value="All">All Projects</option>
                                    {dbProjects.map(proj => (
                                        <option key={proj.id} value={proj.projectCode}>
                                            {proj.projectCode} - {proj.projectName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-700 mb-3">Specific Date</h4>
                                <div className="flex flex-wrap gap-2">
                                    {["All", "2026-02-22", "2026-02-23"].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setFilterDate(d)}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filterDate === d ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                                        >
                                            {d === "All" ? "Any Date" : d.slice(5)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                            <button
                                onClick={() => { setFilterProject("All"); setFilterDate("All"); setIsFilterOpen(false); }}
                                className="flex-1 bg-white border border-gray-200 text-gray-700 rounded-full py-3.5 font-bold text-sm hover:bg-gray-50"
                            >
                                Clear Filters
                            </button>
                            <button
                                onClick={() => setIsFilterOpen(false)}
                                className="flex-1 bg-gray-900 text-white rounded-full py-3.5 font-bold text-sm hover:bg-black"
                            >
                                Apply Filter
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD ACTION MODAL */}
            {isAddOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setIsAddOpen(false)} />
                    <div className="relative w-full sm:w-[400px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom flex flex-col max-h-[90dvh]">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-lg text-gray-900">New Action</h3>
                            <button onClick={() => setIsAddOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                                <X size={16} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex flex-col gap-5">
                            {/* 1. Action Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Action Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={newActionTitle}
                                    onChange={(e) => setNewActionTitle(e.target.value)}
                                    placeholder="e.g. Approve Timesheet"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all font-medium placeholder-gray-400"
                                />
                            </div>

                            {/* 2 & 3. Project and WBS */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Project <span className="text-red-500">*</span></label>
                                    <select
                                        value={newActionProject}
                                        onChange={(e) => setNewActionProject(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all font-medium text-gray-700 appearance-none"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: `2.5rem` }}
                                    >
                                        {dbProjects.map(proj => (
                                            <option key={proj.id} value={proj.projectCode}>
                                                {proj.projectCode} - {proj.projectName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">WBS <span className="text-red-500">*</span></label>
                                    <select
                                        value={newActionWBS}
                                        onChange={(e) => setNewActionWBS(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all font-medium text-gray-700 appearance-none"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: `2.5rem` }}
                                    >
                                        {wbsList.length === 0 ? (
                                            <option value="">No WBS Found</option>
                                        ) : (
                                            wbsList.map(wbs => (
                                                <option key={wbs.id} value={wbs.wbsCode}>
                                                    {wbs.wbsCode} - {wbs.title}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            </div>

                            {/* 4. Deadline */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Date <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        value={newActionDeadlineDate}
                                        onChange={(e) => setNewActionDeadlineDate(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all font-medium text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Time <span className="text-gray-400 font-normal">(Opt)</span></label>
                                    <input
                                        type="time"
                                        value={newActionDeadlineTime}
                                        onChange={(e) => setNewActionDeadlineTime(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all font-medium text-gray-700"
                                    />
                                </div>
                            </div>

                            {/* 5. Status */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Status <span className="text-red-500">*</span></label>
                                <select
                                    value={newActionStatus}
                                    onChange={(e) => setNewActionStatus(e.target.value as StatusType)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all font-medium text-gray-700 appearance-none"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: `2.5rem` }}
                                >
                                    <option value="PENDING">PENDING</option>
                                    <option value="APPROVED">APPROVED</option>
                                    <option value="REJECTED">REJECTED</option>
                                    <option value="REVISION">REVISION</option>
                                    <option value="DISPUTE">DISPUTE</option>
                                </select>
                            </div>

                            {/* 6. Priority */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Priority <span className="text-red-500">*</span></label>
                                <div className="flex flex-wrap gap-2">
                                    {(["LOW", "MEDIUM", "HIGH", "URGENT"] as PriorityType[]).map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setNewActionPriority(p)}
                                            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${newActionPriority === p ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 7. Assignee */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Assignee <span className="text-red-500">*</span></label>
                                <div className="flex flex-wrap gap-2">
                                    {/* Mock simple avatar picker */}
                                    {['MT', 'AR', 'S', 'B', 'T'].map(name => (
                                        <div
                                            key={name}
                                            onClick={() => {
                                                if (newActionAssignees.includes(name)) {
                                                    setNewActionAssignees(newActionAssignees.filter(a => a !== name));
                                                } else {
                                                    setNewActionAssignees([...newActionAssignees, name]);
                                                }
                                            }}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer transition-all ${newActionAssignees.includes(name)
                                                ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-600 ring-offset-2"
                                                : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                                                }`}
                                        >
                                            {name}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 8. Description */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={newActionDescription}
                                    onChange={(e) => setNewActionDescription(e.target.value)}
                                    placeholder="Enter action details..."
                                    rows={3}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all font-medium placeholder-gray-400 resize-none"
                                />
                            </div>

                            {/* 9. File Submission */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Attachments</label>
                                <div className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <UploadCloud size={24} className="text-blue-500" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-700 mb-1">Click to upload or drag & drop</p>
                                    <p className="text-xs text-gray-400 text-center">SVG, PNG, JPG, PDF or DWG (max. 10MB)</p>
                                </div>
                            </div>

                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                            <button
                                onClick={handleAddAction}
                                disabled={!newActionTitle.trim() || newActionAssignees.length === 0}
                                className="w-full bg-[#0062ff] text-white rounded-full py-4 font-bold text-[15px] hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <Check size={18} /> Create Action
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
