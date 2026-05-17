"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
    X,
    RotateCcw,
    CheckSquare,
    FileText,
    Send,
    Loader2
} from "lucide-react";
import { useHeader } from "@/components/providers/HeaderProvider";
import clsx from "clsx";
import FrostedGlassFilter from "@/components/layout/FrostedGlassFilter";
import { fetchAllProjects, fetchProjectWBS } from "@/lib/api/projects";
import { fetchAllActions, createAction, updateActionStatus } from "@/lib/api/actions";
import { fetchTaskComments, addTaskComment } from "@/lib/api/tasks";
import { getFinanceFileUrl } from "@/lib/api/storage";
import useUserProfile from "@/hooks/useUserProfile";
import { supabase } from "@/lib/supabaseClient";
import { Project, WBSItem } from "@/types/project";
import { ActionStatus, ActionPriority, TaskCommentModel } from "@/types/task";

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
    assigneeNames?: string[];
    theme: "pink" | "orange" | "blue" | "gray";
    customAction?: string;
    customActionIcon?: React.ReactNode;
    sourceTaskId?: string | null;
}

const TABS = [
    { id: "all", label: "All", icon: List },
    { id: "urgent", label: "Urgent", icon: Zap },
    { id: "pending", label: "Pending", icon: Clock },
    { id: "returned", label: "Returned", icon: RotateCcw },
    { id: "done", label: "Done", icon: CheckSquare },
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

const getStatusStyles = (status: string, priority: string) => {
    const s = status?.toLowerCase() || "";
    const p = priority?.toLowerCase() || "";

    let statusBadge = "";
    if (s === "pending") statusBadge = "bg-[#d4e1f8] text-[#5485ea] font-bold";
    else if (s === "approved") statusBadge = "bg-[#cfead4] text-[#4cb05f] font-bold";
    else if (s === "rejected" || s === "revision") statusBadge = "bg-[#fde2c9] text-[#f29f4b] font-bold";

    let priorityBadge = "";
    if (p === "urgent") priorityBadge = "bg-[#f7d4dc] text-[#eb5275] font-bold";
    else if (p === "high") priorityBadge = "bg-[#f7d4dc] text-[#eb5275] font-bold";
    else if (p === "medium") priorityBadge = "bg-[#fde2c9] text-[#f29f4b] font-bold";
    else priorityBadge = "bg-[#e4e4e7] text-[#71717a] font-bold";

    return { statusBadge, priorityBadge };
};

const ActionDetailModal = ({
    action,
    isOpen,
    onClose,
    onActionUpdate,
    profiles = [],
}: {
    action: ActionItem | null;
    isOpen: boolean;
    onClose: () => void;
    onActionUpdate: (actionId: string, status: StatusType, sourceTaskId: string | null, revisionReason?: string) => Promise<void>;
    profiles?: any[];
}) => {
    const { profile } = useUserProfile();
    const [isUpdating, setIsUpdating] = useState(false);
    const [task, setTask] = useState<any | null>(null);

    // States for task details
    const [signedUrls, setSignedUrls] = useState<{ name: string; url: string }[]>([]);
    const [submissionSignedUrls, setSubmissionSignedUrls] = useState<{ name: string; url: string }[]>([]);
    const [comments, setComments] = useState<TaskCommentModel[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSendingComment, setIsSendingComment] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [showRevisionInput, setShowRevisionInput] = useState(false);
    const [revisionReason, setRevisionReason] = useState("");

    const chatEndRef = useRef<HTMLDivElement>(null);

    // Reset revision form when drawer opens/closes
    useEffect(() => {
        if (!isOpen) {
            setShowRevisionInput(false);
            setRevisionReason("");
        }
    }, [isOpen]);

    // Load original task data & signed attachments
    useEffect(() => {
        if (!isOpen || !action?.sourceTaskId) {
            setTask(null);
            setSignedUrls([]);
            setSubmissionSignedUrls([]);
            setComments([]);
            return;
        }

        async function fetchOriginalTask() {
            try {
                const { data: dbTask, error } = await supabase
                    .from("tasks")
                    .select("*, projects(project_code), task_assignees(user_id)")
                    .eq("id", action?.sourceTaskId)
                    .single();

                if (error || !dbTask) {
                    console.error("Original task not found:", error);
                    return;
                }

                const assigneeIds = dbTask.task_assignees ? dbTask.task_assignees.map((ta: any) => ta.user_id) : [];
                const tAssigneeNames = assigneeIds.map((uid: string) => {
                    const p = profiles.find(profile => profile.id === uid);
                    return p ? p.full_name : "Unknown Member";
                }).filter(Boolean);

                setTask({
                    id: dbTask.id,
                    title: dbTask.title,
                    description: dbTask.description,
                    taskNumber: dbTask.task_number,
                    attachmentUrls: dbTask.attachment_urls,
                    submissionNote: dbTask.submission_note,
                    submissionUrls: dbTask.submission_urls,
                    status: dbTask.status,
                    priority: dbTask.priority,
                    assignees: assigneeIds,
                    assigneeNames: tAssigneeNames,
                    projectCode: dbTask.projects?.project_code
                });

                 // Load attachments
                if (dbTask.attachment_urls) {
                    const paths = dbTask.attachment_urls.split(',').filter(Boolean);
                    const list = await Promise.all(paths.map(async (p: string) => {
                        try {
                            const signed = await getFinanceFileUrl(p);
                            const name = p.split('/').pop() || 'Attachment';
                            return { name, url: signed || "" };
                        } catch (err) {
                            return { name: 'Attachment', url: '' };
                        }
                    }));
                    setSignedUrls(list.filter(item => item.url));
                }

                // Load submission proofs
                if (dbTask.submission_urls) {
                    const paths = dbTask.submission_urls.split(',').filter(Boolean);
                    const list = await Promise.all(paths.map(async (p: string) => {
                        try {
                            const signed = await getFinanceFileUrl(p);
                            const name = p.split('/').pop() || 'Proof';
                            return { name, url: signed || "" };
                        } catch (err) {
                            return { name: 'Proof', url: '' };
                        }
                    }));
                    setSubmissionSignedUrls(list.filter(item => item.url));
                }

                // Load comments
                const comms = await fetchTaskComments(dbTask.id);
                setComments(comms);
            } catch (err) {
                console.error("Error loading original task:", err);
            }
        }

        fetchOriginalTask();
    }, [isOpen, action?.sourceTaskId, profiles]);

    // Scroll to bottom of chat
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [comments, isChatOpen]);

    const handleSendComment = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!action?.sourceTaskId || !newComment.trim() || !profile?.id) return;
        setIsSendingComment(true);
        const commentMsg = newComment.trim();
        try {
            const added = await addTaskComment(action.sourceTaskId, profile.id, commentMsg);
            if (added) {
                setComments(prev => [...prev, added]);
                setNewComment("");

                // Send notification to task creator and assignees
                if (task) {
                    const senderName = profile.full_name || "Someone";
                    const projCode = task.projectCode || "UNK";
                    const recipientIds = new Set<string>();
                    
                    if (task.createdBy && task.createdBy !== profile.id) {
                        recipientIds.add(task.createdBy);
                    }
                    if (task.assignees) {
                        task.assignees.forEach(uid => {
                            if (uid !== profile.id) {
                                recipientIds.add(uid);
                            }
                        });
                    }

                    const { fetchAdmins, createNotification } = await import("@/lib/api/notifications");
                    const adminIds = await fetchAdmins();
                    adminIds.forEach((adminId: string) => {
                        if (adminId !== profile.id) {
                            recipientIds.add(adminId);
                        }
                    });

                    const isFirstComment = comments.length === 0;
                    const title = isFirstComment ? "Discussion Started" : "New Comment on Task";
                    const description = isFirstComment 
                        ? `${senderName} started a discussion on "${task.title}" . ${projCode}`
                        : `${senderName} replied: "${commentMsg.length > 50 ? commentMsg.slice(0, 50) + '...' : commentMsg}" on "${task.title}" . ${projCode}`;

                    for (const recipientId of Array.from(recipientIds)) {
                        await createNotification({
                            user_id: recipientId,
                            type: "mention",
                            category: "task",
                            title,
                            description,
                            link: `/task?id=${task.id}`,
                            metadata: { taskId: task.id }
                        });
                    }
                }
            }
        } catch (err) {
            console.error("Failed to send comment:", err);
        } finally {
            setIsSendingComment(false);
        }
    };

    if (!isOpen || !action) return null;

    const tStyles = getThemeStyles(action.theme);
    const { statusBadge, priorityBadge } = getStatusStyles(action.status, action.priority);
    const IconComponent =
        action.icon === "target" ? Target : action.icon === "creditCard" ? CreditCard : Clock;
    // Use task's actual taskNumber or fallback to Action WBS
    const taskNumberStr = task?.taskNumber || action.projectCode;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-[90] transition-all duration-500"
                onClick={onClose}
            />

            {/* Bottom Floating Drawer */}
            <div className="fixed z-[100] bottom-2 left-2 right-2 top-20 sm:top-6 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[500px] bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-white/40 rounded-[56px] shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-right duration-500 overflow-hidden flex flex-col">

                {/* Subtle Blue Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-400/15 blur-[100px] pointer-events-none" />

                {/* Drag Handle Indicator */}
                <div className="flex-shrink-0 pt-3 flex justify-center relative z-10">
                    <div className="w-10 h-1.5 rounded-full bg-neutral-200/50" />
                </div>

                {/* HEADER */}
                <div className="flex items-center justify-between px-8 py-6 pb-2 relative z-10">
                    <h3 className="text-[22px] font-extrabold text-neutral-900 dark:text-white tracking-tight flex-1 mr-4">
                        Approval Task: {task?.title || action.title}
                    </h3>
                    <div className="flex items-center gap-2.5 shrink-0">
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-xl border border-black/5 flex items-center justify-center text-neutral-400 hover:text-neutral-900 active:scale-95 transition-all shadow-sm">
                            <X size={20} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="flex-1 overflow-y-auto px-8 py-4 pb-8 space-y-6 relative z-10">
                    {/* Details Flat List */}
                    <div className="space-y-4">
                        {/* Task Number Row */}
                        {taskNumberStr && (
                            <div className="flex items-center py-2 border-b border-black/[0.03] dark:border-white/[0.03]">
                                <span className="text-neutral-400 dark:text-neutral-500 font-bold text-[13px] uppercase tracking-wider w-[120px]">
                                    Task Number
                                </span>
                                <span className="text-[12px] font-extrabold text-blue-600 bg-blue-50/80 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 px-2.5 py-0.5 rounded-[6px] shadow-sm tracking-wider uppercase">
                                    {taskNumberStr}
                                </span>
                            </div>
                        )}

                        {/* Project Row */}
                        <div className="flex items-center py-2 border-b border-black/[0.03] dark:border-white/[0.03]">
                            <span className="text-neutral-400 dark:text-neutral-500 font-bold text-[13px] uppercase tracking-wider w-[120px]">
                                Project
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-blue-600 bg-blue-50/80 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900 px-2 py-0.5 rounded-[6px] shadow-sm tracking-wider uppercase">
                                    {action.projectCode}
                                </span>
                                <span className="text-[14px] text-neutral-800 dark:text-neutral-200 font-medium">
                                    {action.projectName}
                                </span>
                            </div>
                        </div>

                        {/* Deadline Row */}
                        <div className="flex items-center py-2 border-b border-black/[0.03] dark:border-white/[0.03]">
                            <span className="text-neutral-400 dark:text-neutral-500 font-bold text-[13px] uppercase tracking-wider w-[120px]">
                                Deadline
                            </span>
                            <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200 text-[14px] font-semibold">
                                <Calendar size={15} className="text-neutral-400" />
                                {action.date}
                            </div>
                        </div>

                        {/* Priority Row */}
                        <div className="flex items-center py-2 border-b border-black/[0.03] dark:border-white/[0.03]">
                            <span className="text-neutral-400 dark:text-neutral-500 font-bold text-[13px] uppercase tracking-wider w-[120px]">
                                Priority
                            </span>
                            <div className="flex">
                                {(() => {
                                    const p = (task?.priority || action.priority || "").toLowerCase();
                                    if (p === "urgent") {
                                        return (
                                            <span className="bg-red-500 text-white font-bold px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5 shadow-sm">
                                                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" /> Urgent
                                            </span>
                                        );
                                    }
                                    if (p === "high") {
                                        return (
                                            <span className="bg-orange-500 text-white font-bold px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5 shadow-sm">
                                                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" /> High
                                            </span>
                                        );
                                    }
                                    if (p === "medium") {
                                        return (
                                            <span className="bg-amber-500 text-white font-bold px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5 shadow-sm">
                                                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" /> Medium
                                            </span>
                                        );
                                    }
                                    return (
                                        <span className="bg-neutral-400 text-white font-bold px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5 shadow-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" /> Low
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Status Row */}
                        <div className="flex items-center py-2">
                            <span className="text-neutral-400 dark:text-neutral-500 font-bold text-[13px] uppercase tracking-wider w-[120px]">
                                Status
                            </span>
                            <div className="flex">
                                {action.status === "PENDING" && (
                                    <span className="bg-blue-500 text-white font-bold px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5 uppercase shadow-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" /> AWAITING
                                    </span>
                                )}
                                {action.status === "APPROVED" && (
                                    <span className="bg-emerald-500 text-white font-bold px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5 uppercase shadow-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" /> APPROVED
                                    </span>
                                )}
                                {((action.status as string) === "REJECTED" || (action.status as string) === "REVISION" || (action.status as string) === "revision") && (
                                    <span className="bg-amber-600 text-white font-bold px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5 uppercase shadow-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" /> REVISION
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Assignees Section */}
                    <div className="pt-4 border-t border-black/[0.03] dark:border-white/[0.03]">
                        <h4 className="text-[15px] font-bold text-neutral-800 dark:text-neutral-200 mb-3">
                            Assignees
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {(task?.assigneeNames || action.assigneeNames) && (task?.assigneeNames || action.assigneeNames).length > 0 ? (
                                (task?.assigneeNames || action.assigneeNames).map((name: string, idx: number) => {
                                    const initials = (name || "Member")
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .toUpperCase()
                                        .substring(0, 2);
                                    return (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-2 bg-neutral-100/80 dark:bg-neutral-800/80 px-3 py-1.5 rounded-full border border-black/5 shadow-sm"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-800 dark:text-neutral-200">
                                                {initials}
                                            </div>
                                            <span className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">
                                                {name}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <span className="text-[13px] text-neutral-400 font-medium italic">
                                    Unassigned
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Description Section */}
                    <div className="pt-4 border-t border-black/[0.03] dark:border-white/[0.03]">
                        <h4 className="text-[15px] font-bold text-neutral-800 dark:text-neutral-200 mb-2">
                            Description
                        </h4>
                        <p className="text-[14px] text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                            {task?.description || "Please review the attached material and make the necessary decisions to proceed with the action item workflow."}
                        </p>
                    </div>

                    {/* Attachments Section */}
                    {signedUrls.length > 0 && (
                        <div className="pt-4 border-t border-black/[0.03] dark:border-white/[0.03]">
                            <h4 className="text-[15px] font-bold text-neutral-800 dark:text-neutral-200 mb-3">
                                Attachments
                            </h4>
                            <div className="space-y-2">
                                {signedUrls.map((file, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-2.5 pl-3.5 bg-white/40 dark:bg-neutral-800/40 border border-white/60 dark:border-neutral-700/40 shadow-sm rounded-[16px] text-xs"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                            <span className="text-neutral-700 dark:text-neutral-300 font-semibold truncate">
                                                {file.name}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => window.open(file.url, "_blank")}
                                            className="text-[10.5px] font-bold text-blue-600 bg-blue-50/80 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors shrink-0 cursor-pointer"
                                        >
                                            View Document
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Submitted Proofs Section */}
                    {submissionSignedUrls.length > 0 && (
                        <div className="pt-4 border-t border-black/[0.03] dark:border-white/[0.03]">
                            <h4 className="text-[15px] font-bold text-neutral-800 dark:text-neutral-200 mb-3">
                                Submitted Proofs
                            </h4>
                            {task?.submissionNote && (
                                <div className="p-3 bg-white/40 dark:bg-neutral-800/40 border border-white/60 dark:border-neutral-700/40 rounded-[16px] text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-semibold italic mb-3">
                                    "{task.submissionNote}"
                                </div>
                            )}
                            <div className="space-y-2">
                                {submissionSignedUrls.map((file, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-2.5 pl-3.5 bg-white/40 dark:bg-neutral-800/40 border border-white/60 dark:border-neutral-700/40 shadow-sm rounded-[16px] text-xs"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                                            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                                            <span className="text-neutral-700 dark:text-neutral-300 font-semibold truncate">
                                                {file.name}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => window.open(file.url, "_blank")}
                                            className="text-[10.5px] font-bold text-blue-600 bg-blue-50/80 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors shrink-0 cursor-pointer"
                                        >
                                            View Document
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* iOS-Style Discussion / Chat Section */}
                    {action.sourceTaskId && (
                        <div className="pt-4 border-t border-black/[0.03] dark:border-white/[0.03]">
                            {!isChatOpen && comments.length === 0 ? (
                                <button
                                    onClick={() => setIsChatOpen(true)}
                                    className="w-full py-3 bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-[20px] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
                                >
                                    <Send size={12} className="rotate-45" /> Start Discussion
                                </button>
                            ) : (
                                <div className="border border-black/5 dark:border-white/5 rounded-[24px] bg-white/40 dark:bg-neutral-900/30 overflow-hidden shadow-inner">
                                    {/* Chat Header */}
                                    <div className="flex items-center justify-between px-4 py-3 bg-neutral-100/50 dark:bg-neutral-800/50 border-b border-black/[0.03] dark:border-white/[0.03]">
                                        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 font-sans">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                            Task Discussion
                                        </span>
                                        <button
                                            onClick={() => setIsChatOpen(!isChatOpen)}
                                            className="p-1 rounded-full hover:bg-neutral-200/50 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                                            title="Minimize Chat"
                                        >
                                            <ChevronDown size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>

                                    {/* Chat Bubbles */}
                                    {isChatOpen && (
                                        <>
                                            <div className="max-h-60 overflow-y-auto p-4 space-y-3 scroll-smooth">
                                                {comments.length === 0 ? (
                                                    <div className="text-center py-6 text-xs text-neutral-400 font-semibold italic">
                                                        No messages yet. Send a message to start discussion.
                                                    </div>
                                                ) : (
                                                    comments.map((msg, mIdx) => {
                                                        const isMe = msg.userId === profile?.id;
                                                        // Fallback initials or name
                                                        const senderProfile = profiles.find((p) => p.id === msg.userId);
                                                        const name = isMe
                                                            ? (profile?.full_name || "Manager")
                                                            : (senderProfile?.full_name || "Member");
                                                        const initials = name
                                                            .split(" ")
                                                            .map((n: string) => n[0])
                                                            .join("")
                                                            .toUpperCase()
                                                            .substring(0, 2);

                                                        const isRevision = msg.message.startsWith('[REVISION]');
                                                         const displayMessage = isRevision 
                                                             ? `Revision: ${msg.message.replace('[REVISION]', '').trim()}` 
                                                             : msg.message;

                                                         return (
                                                             <div
                                                                 key={msg.id || mIdx}
                                                                 className={clsx(
                                                                     "flex items-end gap-2 max-w-[85%]",
                                                                     isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                                                                 )}
                                                             >
                                                                 {!isMe && (
                                                                     <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[9px] font-extrabold text-neutral-700 dark:text-neutral-300 shrink-0">
                                                                         {initials}
                                                                     </div>
                                                                 )}
                                                                 <div className="flex flex-col gap-0.5">
                                                                     {!isMe && (
                                                                         <span className="text-[10px] font-bold text-neutral-400 pl-1">
                                                                             {name}
                                                                         </span>
                                                                     )}
                                                                     <div
                                                                         className={clsx(
                                                                             "px-3.5 py-2 rounded-[20px] text-xs font-semibold shadow-sm leading-relaxed border",
                                                                             isRevision
                                                                                 ? "bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-100 border-amber-200 dark:border-amber-900/50 rounded-bl-[4px]"
                                                                                 : isMe
                                                                                     ? "bg-blue-600 text-white border-transparent rounded-br-[4px]"
                                                                                     : "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-transparent rounded-bl-[4px]"
                                                                         )}
                                                                     >
                                                                         {displayMessage}
                                                                     </div>
                                                                 </div>
                                                             </div>
                                                          );
                                                      })
                                                 )}
                                                <div ref={chatEndRef} />
                                            </div>

                                            {/* Chat Input */}
                                            <form
                                                onSubmit={handleSendComment}
                                                className="p-3 border-t border-black/[0.03] dark:border-white/[0.03] flex gap-2"
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="Type a message..."
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    className="flex-1 h-9 px-3.5 text-xs rounded-full border border-black/5 dark:border-white/10 bg-white/70 dark:bg-neutral-800/70 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-semibold placeholder:text-neutral-400 placeholder:font-medium"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isSendingComment || !newComment.trim()}
                                                    className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 text-white flex items-center justify-center transition-all active:scale-90 shrink-0 shadow-sm"
                                                >
                                                    {isSendingComment ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <Send size={14} strokeWidth={2.5} className="mr-0.5 mt-0.5 rotate-45" />
                                                    )}
                                                </button>
                                            </form>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* FOOTER */}
                <div className="px-8 pb-10 pt-4 flex flex-col gap-3 relative z-10">
                    {action.status === "PENDING" && (
                        <div className="flex flex-col gap-3">
                            {showRevisionInput ? (
                                <div className="flex flex-col gap-3 p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                    <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                                        Revision Explanation
                                    </h4>
                                    <textarea
                                        value={revisionReason}
                                        onChange={(e) => setRevisionReason(e.target.value)}
                                        placeholder="Please explain what needs to be fixed or updated..."
                                        className="w-full min-h-[80px] p-3 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-amber-500 transition-colors resize-none leading-relaxed"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setShowRevisionInput(false);
                                                setRevisionReason("");
                                            }}
                                            disabled={isUpdating}
                                            className="flex-1 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 h-[44px] rounded-full font-bold text-xs flex items-center justify-center gap-1 active:scale-[0.98] transition-all cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!revisionReason.trim()) {
                                                    alert("Please write a reason for the revision request.");
                                                    return;
                                                }
                                                setIsUpdating(true);
                                                await onActionUpdate(action.id, "REVISION", action.sourceTaskId || null, revisionReason);
                                                setIsUpdating(false);
                                            }}
                                            disabled={isUpdating}
                                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-[44px] rounded-full font-bold text-xs flex items-center justify-center gap-1 active:scale-[0.98] transition-all shadow-md shadow-amber-500/15 cursor-pointer"
                                        >
                                            {isUpdating ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Send size={12} className="rotate-45" /> Send Request
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowRevisionInput(true)}
                                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-[56px] rounded-full font-bold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl shadow-amber-500/10 cursor-pointer"
                                    >
                                        <Undo2 size={16} /> Request Revision
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setIsUpdating(true);
                                            await onActionUpdate(action.id, "APPROVED", action.sourceTaskId || null);
                                            setIsUpdating(false);
                                        }}
                                        disabled={isUpdating}
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-[56px] rounded-full font-bold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl shadow-emerald-500/10 disabled:opacity-50 cursor-pointer"
                                    >
                                        {isUpdating ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <CheckCircle2 size={16} /> Approve Work
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
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
                {action.avatars && action.avatars.length > 0 ? (
                    action.avatars.map((av, idx) => (
                        <div
                            key={idx}
                            className={`w-[26px] h-[26px] rounded-full text-[10px] font-bold flex items-center justify-center border-2 shadow-sm ${av.includes("+")
                                ? "bg-gray-100 text-gray-600 border-white"
                                : "bg-black/10 text-gray-850 border-transparent backdrop-blur-sm bg-gray-250/20"
                                } ${idx > 0 ? "-ml-2" : ""}`}
                        >
                            {av}
                        </div>
                    ))
                ) : (
                    <span className="text-[10.5px] text-neutral-400 font-bold italic tracking-wide">
                        Unassigned
                    </span>
                )}
            </div>
        </div>
    );
};

import PageWrapper from "@/components/layout/PageWrapper";
import TabSidebar, { TabItem } from "@/components/sidebar/TabSidebar";

import ModuleMobileHeader from "@/components/layout/ModuleMobileHeader";

export default function ActionPage() {
    const { profile } = useUserProfile();
    const router = useRouter();

    useEffect(() => {
        if (profile && profile.role === "staff") {
            router.replace("/task");
        }
    }, [profile, router]);

    const [actions, setActions] = useState<ActionItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("urgent");
    const [isScrolled, setIsScrolled] = useState(false);
    const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);

    interface ProfileItem {
        id: string;
        full_name: string;
        avatar_url?: string;
    }
    const [profiles, setProfiles] = useState<ProfileItem[]>([]);

    // Database Projects
    const [dbProjects, setDbProjects] = useState<Project[]>([]);

    useEffect(() => {
        async function loadData() {
            const [projectsData, actionsData, profilesRes, tasksRes] = await Promise.all([
                fetchAllProjects(),
                fetchAllActions(),
                supabase.from('profiles').select('id, full_name, avatar_url'),
                supabase.from('tasks').select('id, priority, task_assignees(user_id)')
            ]);
            setDbProjects(projectsData);
            const profilesData = profilesRes.data || [];
            const tasksData = tasksRes.data || [];
            setProfiles(profilesData);

            const mappedActions: ActionItem[] = actionsData.map(a => {
                const connectedTask = tasksData.find(t => t.id === a.sourceTaskId);
                const actualReviewerIds = (connectedTask && connectedTask.task_assignees && connectedTask.task_assignees.length > 0)
                    ? connectedTask.task_assignees.map((ta: any) => ta.user_id)
                    : (a.reviewers || []);

                const reviewerNames: string[] = [];
                const reviewerAvatars = actualReviewerIds.map(uid => {
                    const p = profilesData.find(profile => profile.id === uid);
                    if (p?.full_name) {
                        reviewerNames.push(p.full_name);
                        return p.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                    }
                    return "U";
                }).filter(Boolean) || [];

                const priorityVal = (connectedTask?.priority 
                    ? connectedTask.priority.toUpperCase() 
                    : a.priority) as PriorityType;

                return {
                    id: a.id,
                    title: a.title,
                    projectCode: a.projectCode || "UNK",
                    projectName: a.projectName || "Unknown Project",
                    date: a.deadlineDate,
                    status: a.status as StatusType,
                    priority: priorityVal,
                    icon: "target",
                    avatars: reviewerAvatars,
                    assigneeNames: reviewerNames,
                    theme: "blue", // Setting default blue for connected items
                    sourceTaskId: a.sourceTaskId,
                };
            });
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

    const handleActionUpdate = async (actionId: string, newStatus: StatusType, sourceTaskId: string | null, revisionReason?: string) => {
        try {
            const success = await updateActionStatus(actionId, newStatus, sourceTaskId);
            if (success) {
                // If revision is requested, insert system comment
                if (newStatus === "REVISION" && sourceTaskId && revisionReason && profile?.id) {
                    await addTaskComment(sourceTaskId, profile.id, `[REVISION] ${revisionReason}`);
                }

                // Send notification to task creator and assignees
                if (sourceTaskId) {
                    (async () => {
                        try {
                            const { data: dbTask, error: dbError } = await supabase
                                .from("tasks")
                                .select("*, projects(project_code), task_assignees(user_id)")
                                .eq("id", sourceTaskId)
                                .single();

                            if (dbError) {
                                console.error("❌ Failed to query task during handleActionUpdate:", dbError);
                            }

                            if (dbTask) {
                                const changerId = profile?.id || "";
                                const changerName = profile?.full_name || "Manager";
                                const projCode = dbTask.projects?.project_code || "UNK";

                                // Determine recipients: creator, all assignees, and admins/supervisors (excluding the changer)
                                const recipientIds = new Set<string>();
                                if (dbTask.created_by && dbTask.created_by !== changerId) {
                                    recipientIds.add(dbTask.created_by);
                                }
                                if (dbTask.task_assignees) {
                                    dbTask.task_assignees.forEach((ta: any) => {
                                        if (ta.user_id !== changerId) {
                                            recipientIds.add(ta.user_id);
                                        }
                                    });
                                }

                                const { fetchAdmins, createNotification } = await import("@/lib/api/notifications");
                                const adminIds = await fetchAdmins();
                                adminIds.forEach((adminId: string) => {
                                    if (adminId !== changerId) {
                                        recipientIds.add(adminId);
                                    }
                                });

                                const isApproved = newStatus === "APPROVED";
                                const isRevision = newStatus === "REVISION";

                                if (isApproved || isRevision) {
                                    const title = isApproved ? "Task Approved" : "Task Revision Required";
                                    const actionWord = isApproved ? "approved" : "requested revision on";
                                    const description = `${changerName} ${actionWord} the task of ${dbTask.title} . ${projCode}`;

                                    for (const recipientId of Array.from(recipientIds)) {
                                        await createNotification({
                                            user_id: recipientId,
                                            type: "info",
                                            category: "task",
                                            title,
                                            description,
                                            link: `/task?id=${dbTask.id}`,
                                            metadata: { taskId: dbTask.id, newStatus: isApproved ? "done" : "revision" }
                                        });
                                    }
                                }
                            }
                        } catch (nErr) {
                            console.error("Failed to send action update notifications:", nErr);
                        }
                    })();
                }

                // Update local state
                setActions(prev => prev.map(a => a.id === actionId ? { ...a, status: newStatus } : a));
                setSelectedAction(null);
            }
        } catch (err) {
            console.error("Failed to update action", err);
        }
    };

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
            const reviewerNames: string[] = [];
            const reviewerAvatars = newActionAssignees.map(uid => {
                const p = profiles.find(profile => profile.id === uid);
                if (p?.full_name) {
                    reviewerNames.push(p.full_name);
                    return p.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                }
                return "U";
            }).filter(Boolean) || [];

            const newAction: ActionItem = {
                id: createdAction.id,
                title: createdAction.title,
                projectCode: createdAction.projectCode || proj.projectCode,
                projectName: createdAction.projectName || proj.projectName,
                date: createdAction.deadlineDate,
                status: createdAction.status as StatusType,
                priority: createdAction.priority as PriorityType,
                icon: "target",
                avatars: reviewerAvatars,
                assigneeNames: reviewerNames,
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
        const todayStr = new Date().toISOString().split('T')[0];
        // 1. Tab Filter
        let tabMatch = false;
        if (activeTab === "all") tabMatch = true;
        else if (activeTab === "pending" && a.status === "PENDING") tabMatch = true;
        else if (activeTab === "urgent" && (a.priority?.toUpperCase() === "URGENT" || a.priority?.toUpperCase() === "HIGH" || (a.date && a.date < todayStr))) tabMatch = true;
        else if (activeTab === "returned" && a.status === "REVISION") tabMatch = true;
        else if (activeTab === "done" && (a.status === "APPROVED" || a.status === "DONE")) tabMatch = true;

        // 2. Project Filter
        let projMatch = filterProject === "All" || a.projectCode === filterProject;

        // 3. Date Filter (Simplified mock logic)
        let dateMatch = filterDate === "All" || a.date === filterDate;

        return tabMatch && projMatch && dateMatch;
    });

    // HEADER INJECTION
    useHeader({
        hideGlobalActions: true,
        right: (
            <div className="flex items-center gap-2">
                {/* Filter Bubble */}
                <div className="h-9 w-9 flex items-center justify-center rounded-full border border-white/20 dark:border-neutral-700/20 bg-white/10 dark:bg-neutral-800/10 backdrop-blur-xl shadow-sm pointer-events-auto transition-all">
                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-white/20 dark:hover:bg-neutral-700/60 text-neutral-800 dark:text-neutral-200 active:scale-95 transition-all relative"
                    >
                        <ListFilter size={18} strokeWidth={1.5} />
                        {(filterProject !== "All" || filterDate !== "All") && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full border border-white dark:border-neutral-800"></span>
                        )}
                    </button>
                </div>
                {/* Add Bubble - Blue, No Shadow */}
                <div className="h-9 w-9 flex items-center justify-center rounded-full border border-blue-400/40 bg-blue-600 dark:bg-blue-500 pointer-events-auto active:scale-95 transition-all">
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="h-7 w-7 flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
                        title="Add Action"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        )
    }, [filterProject, filterDate]);

    return (
        <div className="bg-transparent p-0 transition-colors">
            <FrostedGlassFilter />
            <PageWrapper
                fullWidth
                sidebar={
                    <TabSidebar
                        items={TABS.map(t => ({ id: t.id, label: t.label, icon: <t.icon size={16} /> }))}
                        activeTabId={activeTab}
                        onTabChange={setActiveTab}
                    />
                }
                isTransparent
                header={
                    <div className="hidden md:block mb-0">
                        {/* Desktop Title Section */}
                        <div className="flex flex-col gap-1 mb-0">
                            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight leading-none">
                                Actions
                            </h1>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto mt-6 pb-2 hide-scrollbar lg:hidden">
                            {TABS.map((tab) => {
                                const isActive = activeTab === tab.id;
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={clsx(
                                            "relative flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all flex-shrink-0 text-[13px] group",
                                            isActive
                                                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm border border-black/[0.04] dark:border-white/[0.1] font-bold"
                                                : "text-neutral-500 dark:text-neutral-400 font-medium hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200"
                                        )}
                                    >
                                        <span className="relative z-10">
                                            <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                                        </span>
                                        <span className="relative z-10">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                }
            >
                {/* Main Content Zone */}
                <div
                    className="space-y-6 animate-in fade-in duration-500 pb-20 md:px-0"
                >
                    {/* Mobile Header - With Premium Scrolling Minimize behavior */}
                    <div className="md:hidden">
                        <ModuleMobileHeader
                            title="Actions"
                            tabs={TABS}
                            activeTabId={activeTab}
                            onTabChange={setActiveTab}
                            rightToolbar={
                                <>
                                    <div className="h-10 w-10 flex items-center justify-center rounded-full border border-black/[0.03] dark:border-white/[0.05] bg-white dark:bg-neutral-900 shadow-sm transition-all relative">
                                        <button
                                            onClick={() => setIsFilterOpen(true)}
                                            className="p-2 rounded-full hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                                        >
                                            <ListFilter size={20} className="text-neutral-600 dark:text-neutral-400" strokeWidth={1.5} />
                                            {(filterProject !== "All" || filterDate !== "All") && (
                                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-blue-500 rounded-full border border-white shadow-[0_0_0_2px_white] dark:shadow-[0_0_0_2px_#171717]"></span>
                                            )}
                                        </button>
                                    </div>
                                    <div className="h-10 w-10 flex items-center justify-center rounded-full border border-blue-400/40 bg-blue-600 dark:bg-blue-500 shadow-sm">
                                        <button
                                            onClick={() => setIsAddOpen(true)}
                                            className="p-2 rounded-full hover:bg-white/10 text-blue-50 transition-colors"
                                        >
                                            <Plus size={20} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </>
                            }
                        />
                    </div>

                    {/* ACTION LIST AREA */}
                    <div className="relative z-0 px-5 lg:px-0">
                        {filteredActions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredActions.map((action) => (
                                    <div key={action.id} onClick={() => setSelectedAction(action)} className="cursor-pointer active:scale-[0.98] transition-all hover:translate-y-[-2px]">
                                        <ActionCard action={action} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[40vh] flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
                                    <List className="w-8 h-8 text-neutral-400 opacity-80" />
                                </div>
                                <h2 className="text-[18px] font-bold text-neutral-900 dark:text-white mb-2">Desk is clear!</h2>
                                <p className="text-[14px] font-medium text-neutral-500 dark:text-neutral-400 max-w-[240px] leading-relaxed opacity-80">
                                    No pending actions require your attention across any project.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </PageWrapper>

            {/* ACTION DETAIL MODAL */}
            <ActionDetailModal
                action={selectedAction}
                isOpen={!!selectedAction}
                onClose={() => setSelectedAction(null)}
                onActionUpdate={handleActionUpdate}
                profiles={profiles}
            />

            {/* FILTER MODAL */}
            {isFilterOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-end sm:justify-end">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setIsFilterOpen(false)} />
                    <div className="relative w-full sm:w-[500px] sm:right-6 sm:bottom-6 bg-white rounded-t-[56px] sm:rounded-[56px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right flex flex-col max-h-[90dvh]">
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
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-end sm:justify-end">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setIsAddOpen(false)} />
                    <div className="relative w-full sm:w-[500px] sm:right-6 sm:bottom-6 bg-white rounded-t-[56px] sm:rounded-[56px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right flex flex-col max-h-[90dvh]">
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
                                <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto p-1.5 border border-gray-100 rounded-xl bg-gray-50/50">
                                    {profiles.map(p => {
                                        const initials = p.full_name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase()
                                            .substring(0, 2);
                                        const isSelected = newActionAssignees.includes(p.id);
                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setNewActionAssignees(newActionAssignees.filter(a => a !== p.id));
                                                    } else {
                                                        setNewActionAssignees([...newActionAssignees, p.id]);
                                                    }
                                                }}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all ${
                                                    isSelected
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                                    isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-650"
                                                }`}>
                                                    {initials}
                                                </div>
                                                <span className="text-xs font-semibold">{p.full_name}</span>
                                            </div>
                                        );
                                    })}
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
