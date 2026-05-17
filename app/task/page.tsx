"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import {
  List,
  History,
  Send,
  Undo2,
  CheckCircle2,
  Users,
  FileText,
  CreditCard,
  Calendar,
  Clock,
  Menu,
  Plus,
  ListTodo,
  X,
  ListFilter,
  Check,
  UploadCloud,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Trash2,
  Play,
  Layers,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  MapPin,
  Wrench,
  Loader2,
  Save
} from "lucide-react";
import { fetchAllProjects } from "@/lib/api/projects";
import { fetchAllTasks, createTask, deleteTask, updateTaskStatus, fetchTaskComments, addTaskComment, saveTaskDraft, updateTaskSubtasks } from "@/lib/api/tasks";
import { fetchPeopleDirectory } from "@/lib/api/people";
import { uploadFinanceFileExact, getFinanceFileUrl } from "@/lib/api/storage";
import { createNotification } from "@/lib/api/notifications";
import { supabase } from "@/lib/supabaseClient";
import { Person } from "@/components/feel/people/types";
import { Project } from "@/types/project";
import { TaskStatus, TaskPriority, TaskCommentModel } from "@/types/task";
import { Select } from "@/shared/ui/primitives/select/select";
import useUserProfile from "@/hooks/useUserProfile";
import PageWrapper from "@/components/layout/PageWrapper";
import TabSidebar, { TabItem as SidebarTabItem } from "@/components/sidebar/TabSidebar";
import { useHeader } from "@/components/providers/HeaderProvider";
import ModuleMobileHeader from "@/components/layout/ModuleMobileHeader";
// --- FILENAME SANITIZATION UTILITY ---
const sanitizeFilename = (filename: string): string => {
  const parts = filename.split('.');
  const ext = (parts.pop() || '').toLowerCase();
  const name = parts.join('.');
  
  // Clean special characters, convert spaces & underscores to single hyphens
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-');
    
  const nameBase = cleanName || "file";
  return `${nameBase}.${ext}`;
};

// --- MOCK DATA & TYPES ---
type StatusType = TaskStatus;
type PriorityType = TaskPriority;

interface TaskItem {
  id: string;
  refId?: string;
  subtaskIndicator?: string;
  title: string;
  projectCode: string;
  projectName: string;
  date: string;
  time?: string;
  status: StatusType;
  priority: PriorityType;
  icon: "users" | "fileText" | "creditCard";
  avatars: string[];
  theme: "pink" | "orange" | "blue" | "green" | "gray";
  createdBy?: string | null;
  description?: string;
  assignees?: string[];
  assigneeNames?: string[];
  attachmentUrls?: string | null;
  taskNumber?: string | null;
  submissionNote?: string | null;
  submissionUrls?: string | null;
  subtasks?: any[] | null;
}

const TABS = [
  { id: "all", label: "All", icon: List },
  { id: "active", label: "Active", icon: History },
  { id: "submitted", label: "Submitted", icon: Send },
  { id: "revision", label: "Revision", icon: Undo2 },
  { id: "done", label: "Done", icon: CheckCircle2 },
];

const MOCK_TASKS: TaskItem[] = []; // Removed dummy data

// --- HELPER COMPONENTS ---

const getThemeStyles = (theme: TaskItem["theme"]) => {
  switch (theme) {
    case "pink":
      return {
        bg: "bg-[#fcebef]",
        iconBg: "bg-[#f7d4dc]",
        iconColor: "text-[#eb5275]",
      };
    case "orange":
      return {
        bg: "bg-[#fdf4e8]",
        iconBg: "bg-[#fde2c9]",
        iconColor: "text-[#f29f4b]",
      };
    case "blue":
      return {
        bg: "bg-[#eef3fc]",
        iconBg: "bg-[#d4e1f8]",
        iconColor: "text-[#5485ea]",
      };
    case "green":
      return {
        bg: "bg-[#eaf5ec]",
        iconBg: "bg-[#cfead4]",
        iconColor: "text-[#4cb05f]",
      };
    default:
      return {
        bg: "bg-[#f4f4f5]",
        iconBg: "bg-[#e4e4e7]",
        iconColor: "text-[#71717a]",
      };
  }
};

const getStatusStyles = (status: string, priority: string) => {
  const s = status?.toLowerCase() || "";
  const p = priority?.toLowerCase() || "";

  let statusBadge = "";
  if (s === "todo") statusBadge = "bg-white/60 text-gray-500 font-semibold";
  else if (s === "in_progress") statusBadge = "bg-[#d4e1f8] text-[#5485ea] font-bold";
  else if (s === "submitted") statusBadge = "bg-[#e0e7ff] text-[#4f46e5] font-bold";
  else if (s === "revision") statusBadge = "bg-[#fde2c9] text-[#f29f4b] font-bold";
  else if (s === "done" || s === "completed") statusBadge = "bg-[#cfead4] text-[#4cb05f] font-bold";

  let priorityBadge = "";
  if (p === "urgent") priorityBadge = "bg-[#f7d4dc] text-[#eb5275] font-bold";
  else if (p === "high") priorityBadge = "bg-[#f7d4dc] text-[#eb5275] font-bold";
  else if (p === "medium") priorityBadge = "bg-[#fde2c9] text-[#f29f4b] font-bold";
  else priorityBadge = "bg-[#e4e4e7] text-[#71717a] font-bold";

  return { statusBadge, priorityBadge };
};

const TaskDetailModal = ({
  task,
  isOpen,
  onClose,
  profile,
  people,
  onDeleteTask,
  onStatusUpdate,
  onSubmitTask,
  onSubtasksUpdate,
}: {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  people: any[];
  onDeleteTask: (taskId: string) => Promise<void>;
  onStatusUpdate: (taskId: string, newStatus: StatusType) => Promise<void>;
  onSubmitTask: (taskId: string, submissionNote: string, submissionFiles: File[], existingPaths?: string[], isDraft?: boolean) => Promise<string>;
  onSubtasksUpdate: (taskId: string, updatedSubtasks: any[]) => Promise<void>;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [signedUrls, setSignedUrls] = useState<{name: string, url: string}[]>([]);
  
  // -- SUBMISSION STATE VARIABLES --
  const [submissionSignedUrls, setSubmissionSignedUrls] = useState<{name: string, url: string}[]>([]);
  const [submissionNote, setSubmissionNote] = useState("");
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([]);
  const [isSubmitMode, setIsSubmitMode] = useState(false);
  const [existingSubmissionPaths, setExistingSubmissionPaths] = useState<string[]>([]);

  // Pre-populate proof submission form fields when entering submit/edit proof mode
  useEffect(() => {
    if (isSubmitMode && task) {
      setSubmissionNote(task.submissionNote || "");
      setExistingSubmissionPaths(task.submissionUrls ? task.submissionUrls.split(',').filter(Boolean) : []);
    } else if (!isSubmitMode) {
      setSubmissionNote("");
      setSubmissionFiles([]);
      setExistingSubmissionPaths([]);
    }
  }, [isSubmitMode, task?.id]);
  
  // -- DISCUSSION/CHAT STATE VARIABLES --
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [comments, setComments] = useState<TaskCommentModel[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Load task attachment URLs
  useEffect(() => {
    async function loadUrls() {
      if (!task || !task.attachmentUrls) {
        setSignedUrls([]);
        return;
      }
      const paths = task.attachmentUrls.split(',').filter(Boolean);
      const list = await Promise.all(paths.map(async (p) => {
        try {
          const signed = await getFinanceFileUrl(p);
          const name = p.split('/').pop() || 'File';
          return { name, url: signed || "" };
        } catch (err) {
          console.error("Error signing URL:", err);
          return { name: 'File', url: '' };
        }
      }));
      setSignedUrls(list.filter(item => item.url));
    }
    loadUrls();
  }, [task?.id, task?.attachmentUrls]);

  // Load task submission proof URLs
  useEffect(() => {
    async function loadSubmissionUrls() {
      if (!task || !task.submissionUrls) {
        setSubmissionSignedUrls([]);
        return;
      }
      const paths = task.submissionUrls.split(',').filter(Boolean);
      const list = await Promise.all(paths.map(async (p) => {
        try {
          const signed = await getFinanceFileUrl(p);
          const name = p.split('/').pop() || 'File';
          return { name, url: signed || "" };
        } catch (err) {
          console.error("Error signing URL:", err);
          return { name: 'File', url: '' };
        }
      }));
      setSubmissionSignedUrls(list.filter(item => item.url));
    }
    loadSubmissionUrls();
  }, [task?.id, task?.submissionUrls]);

  // Load comments
  useEffect(() => {
    async function loadComments() {
      if (!task?.id) return;
      try {
        const list = await fetchTaskComments(task.id);
        setComments(list);
      } catch (err) {
        console.error("Error loading comments:", err);
      }
    }
    if (isOpen && task?.id) {
      loadComments();
    }
  }, [task?.id, isOpen]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments, isChatOpen]);

  if (!isOpen || !task) return null;

  const tStyles = getThemeStyles(task.theme);
  const { statusBadge, priorityBadge } = getStatusStyles(task.status, task.priority);
  const IconComponent =
    task.icon === "users" ? Users : task.icon === "fileText" ? FileText : CreditCard;

  const userRole = (profile?.role || "").toLowerCase();
  const canDelete =
    ["superadmin", "admin", "administrator", "supervisor", "manager"].includes(userRole) ||
    (task.createdBy && profile?.id && task.createdBy === profile.id);

  const isAssignee = task.assignees?.includes(profile?.id);
  const isManagement = ["superadmin", "admin", "administrator", "supervisor", "manager"].includes(userRole);

  const handleStatusChange = async (newStatus: StatusType) => {
    if (!task) return;
    setIsUpdating(true);
    try {
      await onStatusUpdate(task.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!task || !newComment.trim() || !profile?.id) return;
    setIsSendingComment(true);
    try {
      const added = await addTaskComment(task.id, profile.id, newComment.trim());
      if (added) {
        setComments(prev => [...prev, added]);
        setNewComment("");
        
        // Broadcast notification asynchronously
        (async () => {
          try {
            const senderName = profile?.full_name || "Adidaya Member";
            const projCode = task.projectCode || "PRG";
            const commentMsg = added.message;
            
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

            // Keep all supervisors and admins in the loop
            people.forEach(p => {
              const role = (p.role || "").toLowerCase();
              if (["superadmin", "admin", "administrator", "supervisor"].includes(role) && p.id !== profile.id) {
                recipientIds.add(p.id);
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
          } catch (nErr) {
            console.error("Failed to broadcast chat notification:", nErr);
          }
        })();
      }
    } catch (err) {
      console.error("Error sending comment:", err);
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!task) return;
    setIsUpdating(true);
    try {
      const newUrls = await onSubmitTask(task.id, submissionNote, submissionFiles, existingSubmissionPaths, true);
      setExistingSubmissionPaths(newUrls ? newUrls.split(',').filter(Boolean) : []);
      setSubmissionFiles([]);
      alert("Draft saved successfully!");
    } catch (e: any) {
      console.error("Error in handleSaveDraft:", e);
      alert("Saving draft failed. Error: " + (e.message || e));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!task) return;
    setIsUpdating(true);
    try {
      await onSubmitTask(task.id, submissionNote, submissionFiles, existingSubmissionPaths);
      setIsSubmitMode(false);
      setSubmissionNote("");
      setSubmissionFiles([]);
      setExistingSubmissionPaths([]);
    } catch (e: any) {
      console.error("Error in handleFinalSubmit:", e);
      alert("Submission failed. Error: " + (e.message || e));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!task || isUpdating) return;
    if (task.status === "todo") {
      alert("Please start the task before toggling subtasks!");
      return;
    }
    const currentSubtasks = task.subtasks || [];
    const updatedSubtasks = currentSubtasks.map((st: any) =>
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );

    setIsUpdating(true);
    try {
      const success = await updateTaskSubtasks(task.id, updatedSubtasks);
      if (success) {
        await onSubtasksUpdate(task.id, updatedSubtasks);
      } else {
        alert("Failed to update subtask status in the database.");
      }
    } catch (e) {
      console.error("Error toggling subtask:", e);
    } finally {
      setIsUpdating(false);
    }
  };

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
            {task.title}
          </h3>
          <div className="flex items-center gap-2.5 shrink-0">
            {canDelete && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to delete this task?")) {
                    onDeleteTask(task.id);
                  }
                }}
                className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/20 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 active:scale-95 transition-all flex items-center justify-center shadow-sm border border-red-100/50 dark:border-red-900/30"
                title="Delete Task"
              >
                <Trash2 size={18} strokeWidth={2} />
              </button>
            )}
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
            {task.taskNumber && (
              <div className="flex items-center py-2 border-b border-black/[0.03] dark:border-white/[0.03]">
                <span className="text-neutral-400 dark:text-neutral-500 font-bold text-[13px] uppercase tracking-wider w-[120px]">
                  Task Number
                </span>
                <span className="text-[12px] font-extrabold text-blue-600 bg-blue-50/80 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 px-2.5 py-0.5 rounded-[6px] shadow-sm tracking-wider uppercase">
                  {task.taskNumber}
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
                  {task.projectCode}
                </span>
                <span className="text-[14px] text-neutral-800 dark:text-neutral-200 font-medium">
                  {task.projectName}
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
                {task.date}
              </div>
            </div>

            {/* Priority Row */}
            <div className="flex items-center py-2 border-b border-black/[0.03] dark:border-white/[0.03]">
              <span className="text-neutral-400 dark:text-neutral-500 font-bold text-[13px] uppercase tracking-wider w-[120px]">
                Priority
              </span>
              <div className="flex">
                {task.priority === "urgent" && (
                  <span className="bg-red-500 text-white font-bold px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" /> Urgent
                  </span>
                )}
                {task.priority === "high" && (
                  <span className="bg-orange-500 text-white font-bold px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" /> High
                  </span>
                )}
                {task.priority === "medium" && (
                  <span className="bg-amber-500 text-white font-bold px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" /> Medium
                  </span>
                )}
                {task.priority === "low" && (
                  <span className="bg-neutral-400 text-white font-bold px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" /> Low
                  </span>
                )}
              </div>
            </div>

            {/* Status Row */}
            <div className="flex items-center py-2">
              <span className="text-neutral-400 dark:text-neutral-500 font-bold text-[13px] uppercase tracking-wider w-[120px]">
                Status
              </span>
              <div className="flex">
                {task.status === "todo" && (
                  <span className="bg-neutral-400 text-white font-bold px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5 uppercase shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" /> TODO
                  </span>
                )}
                {task.status === "in_progress" && (
                  <span className="bg-blue-500 text-white font-bold px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5 uppercase shadow-sm animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" /> IN PROGRESS
                  </span>
                )}
                {task.status === "submitted" && (
                  <span className="bg-blue-500 text-white font-bold px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5 uppercase shadow-sm animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" /> AWAITING
                  </span>
                )}
                {task.status === "revision" && (
                  <span className="bg-amber-600 text-white font-bold px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5 uppercase shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" /> REVISION
                  </span>
                )}
                {task.status === "done" && (
                  <span className="bg-emerald-500 text-white font-bold px-3 py-1 rounded-full text-[12px] flex items-center gap-1.5 uppercase shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" /> DONE
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
              {task.assigneeNames && task.assigneeNames.length > 0 ? (
                task.assigneeNames.map((name, idx) => {
                  const initials = name
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
              {task.description || "No description provided."}
            </p>
          </div>

          {/* Subtasks Section */}
          <div className="pt-4 border-t border-black/[0.03] dark:border-white/[0.03]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[15px] font-bold text-neutral-800 dark:text-neutral-200">
                Subtasks
              </h4>
              {task.subtasks && task.subtasks.length > 0 && (
                <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 px-2 py-0.5 rounded-[6px] shadow-sm">
                  {task.subtasks.filter((st: any) => st.done).length} / {task.subtasks.length} Done
                </span>
              )}
            </div>
            {task.subtasks && task.subtasks.length > 0 ? (
              <div className="space-y-2.5">
                {task.subtasks.map((st: any) => {
                  const canToggle = isAssignee || isManagement;
                  const isTaskTodo = task.status === "todo";
                  return (
                    <div
                      key={st.id}
                      onClick={() => canToggle && handleToggleSubtask(st.id)}
                      className={`flex items-start gap-3 p-3 bg-neutral-50/50 dark:bg-neutral-800/20 border border-black/5 dark:border-white/5 rounded-[16px] shadow-sm transition-all duration-200 ${
                        canToggle ? "cursor-pointer active:scale-[0.99]" : ""
                      } ${
                        isTaskTodo ? "opacity-60" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40 hover:scale-[1.01]"
                      }`}
                    >
                      <div className="flex items-center h-5 shrink-0">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            st.done
                              ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                              : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                          }`}
                        >
                          {st.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                      <span
                        className={`text-[13.5px] font-medium leading-tight select-none transition-all ${
                          st.done
                            ? "text-neutral-400 line-through decoration-neutral-300"
                            : "text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="text-[13px] text-neutral-400 font-medium italic">
                No subtasks defined.
              </span>
            )}
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
                    className="flex items-center justify-between p-2.5 pl-3.5 bg-neutral-50 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5 shadow-sm rounded-[16px] text-xs"
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
                      className="text-[10.5px] font-bold text-blue-600 bg-blue-50/80 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors active:scale-95 duration-150 shrink-0"
                    >
                      View Document
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Work Proof Form */}
          {isSubmitMode && (
            <div className="pt-6 border-t border-blue-100 dark:border-blue-900/40 space-y-4 bg-blue-50/20 dark:bg-blue-950/5 p-5 rounded-[24px] border border-blue-500/10 shadow-inner">
              <div className="flex items-center justify-between">
                <h4 className="text-[15px] font-extrabold text-blue-600 dark:text-blue-400">
                  Submit Proof of Work
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 px-2 py-0.5 rounded-[6px]">
                  Draft
                </span>
              </div>

              {/* Note Textarea */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Submission Note
                </label>
                <textarea
                  placeholder="Explain what you have completed..."
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  className="w-full h-24 p-3.5 text-xs border border-black/5 dark:border-white/10 rounded-[16px] bg-white/70 dark:bg-neutral-800/70 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold resize-none"
                />
              </div>

              {/* File Attachment Selector & List */}
              <div className="space-y-2.5">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Proof Attachments
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => document.getElementById('submission-file-input')?.click()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xs transition-all active:scale-95 shadow-sm shadow-blue-500/15 cursor-pointer"
                  >
                    Choose Files
                  </button>
                  <span className="text-xs text-neutral-400 font-medium">
                    {submissionFiles.length === 0 ? "No new files selected" : `${submissionFiles.length} new file(s) selected`}
                  </span>
                </div>
                <input 
                  id="submission-file-input"
                  type="file" 
                  multiple 
                  className="hidden"
                  onChange={e => {
                    const files = Array.from(e.target.files || []) as File[];
                    setSubmissionFiles(prev => [...prev, ...files]);
                  }}
                />

                {/* Unified files list: Existing + Newly chosen */}
                {(existingSubmissionPaths.length > 0 || submissionFiles.length > 0) && (
                  <div className="space-y-2 pt-2">
                    {/* Existing Files */}
                    {existingSubmissionPaths.map((path, idx) => {
                      const name = sanitizeFilename(path.split('/').pop() || 'File');
                      return (
                        <div 
                          key={`exist-${idx}`} 
                          className="flex items-center justify-between p-2.5 pl-3.5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 shadow-sm rounded-[16px] text-xs"
                        >
                          <div 
                            className="flex items-center gap-2 overflow-hidden flex-1 mr-2 cursor-pointer group/item"
                            onClick={async () => {
                              const signed = await getFinanceFileUrl(path);
                              if (signed) window.open(signed, "_blank");
                            }}
                            title="Click to view existing file"
                          >
                            <FileText className="w-4 h-4 text-amber-500 shrink-0 group-hover/item:scale-105 transition-transform" />
                            <span className="text-neutral-700 dark:text-neutral-300 font-semibold truncate group-hover/item:text-amber-600 dark:group-hover/item:text-amber-400 group-hover/item:underline transition-colors">
                              {name}
                            </span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setExistingSubmissionPaths(prev => prev.filter((_, i) => i !== idx))}
                            className="text-[11px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1 rounded-md transition-colors shrink-0 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}

                    {/* Newly Selected Files */}
                    {submissionFiles.map((file, idx) => (
                      <div 
                        key={`new-${idx}`} 
                        className="flex items-center justify-between p-2.5 pl-3.5 bg-white/85 dark:bg-neutral-800/85 border border-black/5 dark:border-white/5 shadow-sm rounded-[16px] text-xs"
                      >
                        <div 
                          className="flex items-center gap-2 overflow-hidden flex-1 mr-2 cursor-pointer group/item"
                          onClick={() => {
                            const previewUrl = URL.createObjectURL(file);
                            window.open(previewUrl, "_blank");
                          }}
                          title="Click to preview file"
                        >
                          <FileText className="w-4 h-4 text-blue-500 shrink-0 group-hover/item:scale-105 transition-transform" />
                          <span className="text-neutral-700 dark:text-neutral-300 font-semibold truncate group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 group-hover/item:underline transition-colors">
                            {file.name}
                          </span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setSubmissionFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-[11px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1 rounded-md transition-colors shrink-0 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submitted Proofs Section */}
          {!isSubmitMode && submissionSignedUrls.length > 0 && (
            <div className="pt-4 border-t border-black/[0.03] dark:border-white/[0.03]">
              <h4 className="text-[15px] font-bold text-neutral-800 dark:text-neutral-200 mb-3">
                Submitted Proofs
              </h4>
              {task.submissionNote && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5 rounded-[16px] text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-semibold italic mb-3">
                  "{task.submissionNote}"
                </div>
              )}
              <div className="space-y-2">
                {submissionSignedUrls.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 pl-3.5 bg-neutral-50 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5 shadow-sm rounded-[16px] text-xs"
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
                      className="text-[10.5px] font-bold text-blue-600 bg-blue-50/80 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors active:scale-95 duration-150 shrink-0"
                    >
                      View Document
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discussion / Chat Section */}
          {(task.status === "in_progress" || task.status === "submitted" || task.status === "revision" || task.status === "done") && (
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
                            const member = people.find(p => p.id === msg.userId);
                            const name = member?.name || "Member";
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
          {/* Submit Mode Actions */}
          {isSubmitMode ? (
            <div className="flex flex-col gap-3 w-full animate-in fade-in duration-300">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isUpdating}
                  className="flex-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-300 h-[56px] rounded-full font-bold text-[15px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all border border-amber-200/50 dark:border-amber-900/30 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Draft
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isUpdating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-[56px] rounded-full font-bold text-[15px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-xl shadow-blue-500/10 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" strokeWidth={3} /> Submit Proof
                    </>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitMode(false)}
                className="w-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 h-[48px] rounded-full font-bold text-[14px] active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              {/* Standard Task Mode Actions */}
              {task.status === "todo" && (
                <button
                  onClick={() => handleStatusChange("in_progress")}
                  disabled={isUpdating || !isAssignee}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-[56px] rounded-full font-bold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl shadow-blue-500/10 disabled:opacity-50"
                >
                  {isUpdating ? (
                    "Starting..."
                  ) : (
                    <>
                      <Play size={16} fill="currentColor" /> Start Task
                    </>
                  )}
                </button>
              )}

              {task.status === "in_progress" && (
                (isAssignee || isManagement) ? (
                  <button
                    onClick={() => setIsSubmitMode(true)}
                    disabled={isUpdating}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-[56px] rounded-full font-bold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl shadow-emerald-500/10 disabled:opacity-50"
                  >
                    <Send size={16} /> Submit Work Proof
                  </button>
                ) : (
                  <div className="w-full py-4 text-center text-xs font-semibold text-neutral-400 bg-neutral-50 dark:bg-neutral-800/40 rounded-[20px] border border-black/[0.03]">
                    Assignee is currently working on this task.
                  </div>
                )
              )}

              {task.status === "submitted" && (
                <div className="w-full py-4 text-center text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-[20px] border border-blue-100/50 dark:border-blue-900/30">
                  Awaiting Review & Approval
                </div>
              )}

              {task.status === "revision" && (
                (isAssignee || isManagement) ? (
                  <button
                    onClick={() => setIsSubmitMode(true)}
                    disabled={isUpdating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-[56px] rounded-full font-bold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl shadow-blue-500/10 disabled:opacity-50"
                  >
                    <Undo2 size={16} /> Resubmit Proof
                  </button>
                ) : (
                  <div className="w-full py-4 text-center text-xs font-semibold text-amber-500 bg-amber-50/50 dark:bg-amber-950/20 rounded-[20px] border border-amber-100/50 dark:border-amber-900/30">
                    Task needs revision. Waiting for assignee to submit update.
                  </div>
                )
              )}

              {task.status === "done" && (
                <div className="w-full py-4 text-center text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-[20px] border border-emerald-100/50 dark:border-emerald-900/30 flex items-center justify-center gap-1.5 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={2.5} /> Task completed successfully
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

const TaskCard = ({ task, onClick }: { task: TaskItem; onClick?: () => void }) => {
  const tStyles = getThemeStyles(task.theme);
  const { statusBadge, priorityBadge } = getStatusStyles(task.status, task.priority);

  const IconComponent =
    task.icon === "users" ? Users : task.icon === "fileText" ? FileText : CreditCard;

  const completedSubtasks = task.subtasks ? task.subtasks.filter((st: any) => st.done).length : 0;
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
  const subtaskIndicatorVal = totalSubtasks > 0 ? `${completedSubtasks}/${totalSubtasks}` : task.subtaskIndicator;

  return (
    <div className={`p-4 rounded-[20px] ${tStyles.bg} flex flex-col gap-3 relative shadow-sm mb-4`}>
      {/* Top row: Icon + Rest */}
      <div className="flex gap-3">
        {/* Left Icon */}
        <div
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${tStyles.iconBg}`}
        >
          <IconComponent size={20} className={tStyles.iconColor} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          {/* Ref ID & Subtask Pill */}
          {(task.taskNumber || task.refId || subtaskIndicatorVal) && (
            <div className="flex items-center gap-2 mb-1">
              {task.taskNumber ? (
                <span className="text-[11px] font-extrabold text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-[6px] shadow-sm tracking-wider uppercase">
                  {task.taskNumber}
                </span>
              ) : task.refId ? (
                <span className="text-[11px] font-bold text-gray-500 tracking-wide uppercase">
                  {task.refId}
                </span>
              ) : null}
              {subtaskIndicatorVal && (
                <div className="flex items-center gap-1 bg-black/5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-gray-600">
                  <ListTodo size={10} />
                  <span>{subtaskIndicatorVal}</span>
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <h3 className="text-[17px] font-bold text-gray-900 leading-tight pr-[60px]">
            {task.title}
          </h3>

          {/* Project */}
          <div className="flex items-center gap-2 mt-2">
            <span className="bg-black/5 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
              {task.projectCode}
            </span>
            <span className="text-[13px] text-gray-500 font-medium truncate">
              {task.projectName}
            </span>
          </div>

          {/* Date & Time */}
          <div className="flex items-center gap-3 mt-2 text-[12px] font-semibold text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar size={12} className="opacity-70" />
              <span>{task.date}</span>
            </div>
            {task.time && (
              <div className="flex items-center gap-1">
                <Clock size={12} className="opacity-70" />
                <span>{task.time}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Status Badges (Absolute positioned for top right corner style) */}
        <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
          <span className={`text-[9px] px-2 py-0.5 rounded-full tracking-wider uppercase ${statusBadge}`}>
            {task.status.replace("_", " ")}
          </span>
          <span className={`text-[9px] px-2 py-0.5 rounded-full tracking-wider uppercase ${priorityBadge}`}>
            {task.priority}
          </span>
        </div>
      </div>

      {/* Avatars */}
      <div className="absolute bottom-4 right-4 flex items-center">
        {task.avatars.map((av, idx) => (
          <div
            key={idx}
            className={`w-[26px] h-[26px] rounded-full text-[10px] font-bold flex items-center justify-center border-2 shadow-sm ${av.includes("+")
              ? "bg-gray-100 text-gray-600 border-white"
              : "bg-white text-gray-800 border-white/50"
              } ${idx > 0 ? "-ml-2" : ""}`}
            style={
              !av.includes("+")
                ? {
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
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

const WBS_TEMPLATES = [
  {
    code: "S",
    name: "Structure (Struktur)",
    sections: [
      { code: "S.1", name: "Preparation (Persiapan)" },
      { code: "S.2", name: "Earthworks (Pekerjaan Tanah)" },
      { code: "S.3", name: "Foundation (Pekerjaan Pondasi)" },
      { code: "S.4", name: "Concrete Structure (Struktur Beton)" },
      { code: "S.5", name: "Steel/Roof Structure (Struktur Atap)" },
    ],
  },
  {
    code: "A",
    name: "Architecture (Arsitektur)",
    sections: [
      { code: "A.1", name: "Wall Masonry & Plaster (Dinding & Plesteran)" },
      { code: "A.2", name: "Wall Finishes (Finishing Dinding)" },
      { code: "A.3", name: "Floor Finishes (Finishing Lantai)" },
      { code: "A.4", name: "Ceiling Works (Pekerjaan Plafond)" },
      { code: "A.5", name: "Painting (Pengecatan)" },
      { code: "A.6", name: "Doors & Windows (Kusen, Pintu & Jendela)" },
      { code: "A.7", name: "Sanitary Ware (Sanitair)" },
      { code: "A.8", name: "Facade & Cladding (Fasad)" },
    ],
  },
  {
    code: "M",
    name: "MEP (Mechanical Electrical Plumbing)",
    sections: [
      { code: "M.1", name: "Electrical & Lighting (Elektrikal & Penerangan)" },
      { code: "M.2", name: "Plumbing & Water Supply (Plumbing & Air)" },
      { code: "M.3", name: "Air Conditioning & HVAC (AC & HVAC)" },
      { code: "M.4", name: "Fire Fighting (Pemadam Kebakaran)" },
      { code: "M.5", name: "Lightning Protection (Proteksi Petir)" },
    ],
  },
  {
    code: "I",
    name: "Interior",
    sections: [
      { code: "I.1", name: "Built-in Furniture (Furnitur Custom)" },
      { code: "I.2", name: "Loose Furniture (Furnitur Loose)" },
      { code: "I.3", name: "Interior Wall Coverings (Finishing Interior)" },
      { code: "I.4", name: "Special Lighting (Lampu Dekoratif)" },
    ],
  },
  {
    code: "L",
    name: "Landscape (Lansekap)",
    sections: [
      { code: "L.1", name: "Hardscape (Pekerasan)" },
      { code: "L.2", name: "Softscape (Tanaman)" },
      { code: "L.3", name: "Drainage & Irrigation (Saluran Air)" },
      { code: "L.4", name: "Garden Lighting (Lampu Taman)" },
    ],
  },
];

export default function TaskPage() {
  const { profile, loading: profileLoading } = useUserProfile();

  // Add form state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("PRG");
  const [newTaskDeadlineDate, setNewTaskDeadlineDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskDeadlineTime, setNewTaskDeadlineTime] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("todo");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("medium");
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);

  // WBS Step Picker States
  const [wbsDiscipline, setWbsDiscipline] = useState<string>("A");
  const [wbsSection, setWbsSection] = useState<string>("A.1");

  // Assignee Search & Inline Subtask states
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [subtaskInputValue, setSubtaskInputValue] = useState("");

  // Form Dropdowns & Custom layout alignment states
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<string[]>([]);

  // Other UI state
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [dbProjects, setDbProjects] = useState<Project[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterProject, setFilterProject] = useState<string>("All");
  const [filterDate, setFilterDate] = useState<string>("All");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  // Memoized valid assignees for validation and UI
  const validAssignees = useMemo(() => {
    return newTaskAssignees.filter(id => id && id.trim() !== "");
  }, [newTaskAssignees]);

  useEffect(() => {
    async function loadData() {
      const [projectsData, tasksData, peopleData] = await Promise.all([
        fetchAllProjects(),
        fetchAllTasks(),
        fetchPeopleDirectory()
      ]);
      setDbProjects(projectsData);
      
      let includedPeople = peopleData.filter(p => (p.status || "").toUpperCase() === "INCLUDED");
      if (includedPeople.length === 0 && peopleData.length > 0) {
        includedPeople = peopleData;
      }
      setPeople(includedPeople);

      console.log(`[DIAGNOSTIC] Loaded ${projectsData.length} projects, ${peopleData.length} total people.`);
      console.log(`[DIAGNOSTIC] Current user profile:`, profile);

      const mappedTasks: TaskItem[] = tasksData.map(t => {
        const tAvatars = t.assignees?.map(uid => {
          const p = includedPeople.find(person => person.id === uid);
          if (p?.name) {
            return p.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
          }
          return "U";
        }) || ["U"];

        const tAssigneeNames = t.assignees?.map(uid => {
          const p = includedPeople.find(person => person.id === uid);
          return p?.name || "Unknown User";
        }) || [];

        return {
          id: t.id,
          refId: t.wbsCode || t.wbsTitle || undefined,
          title: t.title,
          projectCode: t.projectCode || "UNK",
          projectName: t.projectName || "Unknown Project",
          date: t.deadlineDate,
          time: t.deadlineTime || undefined,
          status: t.status as StatusType,
          priority: t.priority as PriorityType,
          icon: "fileText",
          avatars: tAvatars.length > 0 ? tAvatars : ["U"],
          theme: "pink",
          createdBy: t.createdBy,
          description: t.description || undefined,
          assignees: t.assignees || [],
          assigneeNames: tAssigneeNames,
          attachmentUrls: t.attachmentUrls || null,
          taskNumber: t.taskNumber || null,
          submissionNote: t.submissionNote || null,
          submissionUrls: t.submissionUrls || null,
          subtasks: t.subtasks || [],
        };
      });
      setTasks(mappedTasks);
      setIsLoading(false);
    }
    loadData();
  }, [profile]);

  // Header Injection
  useHeader(useMemo(() => ({
    hideGlobalActions: true,
    right: (
      <div className="flex items-center gap-1.5">
        <div className="h-9 w-9 flex items-center justify-center rounded-full border border-white/20 dark:border-neutral-700/20 bg-white/10 dark:bg-neutral-800/10 backdrop-blur-xl shadow-sm">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => window.dispatchEvent(new CustomEvent('task:open-filter'))}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/20 dark:hover:bg-neutral-700/60 transition-colors relative"
            title="Filter Tasks"
          >
            <ListFilter size={18} strokeWidth={1.5} className="text-neutral-800 dark:text-neutral-200" />
            {(filterProject !== "All" || filterDate !== "All") && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full border border-white dark:border-neutral-800"></span>
            )}
          </motion.button>
        </div>
        <div className="h-9 w-9 flex items-center justify-center rounded-full border border-blue-400/40 bg-blue-600 dark:bg-blue-500 pointer-events-auto active:scale-95 transition-all">
            <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => window.dispatchEvent(new CustomEvent('task:open-add'))}
                className="h-7 w-7 flex items-center justify-center rounded-full text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                title="Add Task"
            >
                <Plus size={18} strokeWidth={2.5} />
            </motion.button>
        </div>
      </div>
    )
  }), [filterProject, filterDate, isMounted]), [isMounted, filterProject, filterDate]);

  // Event Listeners for Header Actions
  useEffect(() => {
    const handleOpenFilter = () => setIsFilterOpen(true);
    const handleOpenAdd = () => setIsAddOpen(true);
    window.addEventListener('task:open-filter', handleOpenFilter);
    window.addEventListener('task:open-add', handleOpenAdd);
    return () => {
      window.removeEventListener('task:open-filter', handleOpenFilter);
      window.removeEventListener('task:open-add', handleOpenAdd);
    };
  }, []);

  const handleDeleteTask = async (taskId: string) => {
    try {
      const success = await deleteTask(taskId);
      if (success) {
        setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
        setSelectedTask(null);
      } else {
        alert("Failed to delete task. Please try again.");
      }
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("An error occurred while deleting the task.");
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: StatusType) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      const success = await updateTaskStatus(taskId, newStatus);
      if (success) {
        setTasks(prevTasks =>
          prevTasks.map(t => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
        setSelectedTask(prevSelected =>
          prevSelected && prevSelected.id === taskId
            ? { ...prevSelected, status: newStatus }
            : prevSelected
        );

        // Asynchronously dispatch task status update notifications
        if (task) {
          (async () => {
            try {
              const changerName = profile?.full_name || "Adidaya Member";
              const changerId = profile?.id;
              const projCode = task.projectCode || "PRG";
              
              // Map newStatus to descriptive action
              let actionPhrase = `updated status of "${task.title}" to ${newStatus}`;
              if (newStatus === "in_progress") {
                actionPhrase = `started the task of ${task.title}`;
              } else if (newStatus === "done") {
                actionPhrase = `completed the task of ${task.title}`;
              } else if (newStatus === "todo" && (task.status === "in_progress" || task.status === "done")) {
                actionPhrase = `requested revision on the task of ${task.title}`;
              } else if (newStatus === "todo") {
                actionPhrase = `marked the task of ${task.title} as To Do`;
              }

              const description = `${changerName} ${actionPhrase} . ${projCode}`;

              // Determine recipients: creator, all assignees, and all supervisors/admins (excluding the changer)
              const recipientIds = new Set<string>();
              if (task.createdBy && task.createdBy !== changerId) {
                recipientIds.add(task.createdBy);
              }
              if (task.assignees) {
                task.assignees.forEach(uid => {
                  if (uid !== changerId) {
                    recipientIds.add(uid);
                  }
                });
              }

              people.forEach(p => {
                const role = (p.role || "").toLowerCase();
                if (["superadmin", "admin", "administrator", "supervisor"].includes(role) && p.id !== changerId) {
                  recipientIds.add(p.id);
                }
              });

              for (const recipientId of Array.from(recipientIds)) {
                await createNotification({
                  user_id: recipientId,
                  type: "info",
                  category: "task",
                  title: "Task Status Updated",
                  description,
                  link: `/task?id=${task.id}`,
                  metadata: { taskId: task.id, newStatus }
                });
              }
            } catch (nErr) {
              console.error("Failed to send status update notifications:", nErr);
            }
          })();
        }
      } else {
        alert("Failed to update task status. Please try again.");
      }
    } catch (err) {
      console.error("Error updating task status:", err);
      alert("An error occurred while updating task status.");
    }
  };

  const handleSubtasksUpdate = async (taskId: string, updatedSubtasks: any[]) => {
    setTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === taskId ? { ...t, subtasks: updatedSubtasks } : t
      )
    );
    setSelectedTask(prevSelected =>
      prevSelected && prevSelected.id === taskId
        ? { ...prevSelected, subtasks: updatedSubtasks }
        : prevSelected
    );
  };

  const onSubmitTask = async (taskId: string, submissionNote: string, submissionFiles: File[], existingPaths: string[] = [], isDraft = false) => {
    // 1. Upload files if any
    let submissionUrls = "";
    if (submissionFiles.length > 0) {
      const uploadPromises = submissionFiles.map(async (file) => {
        const uniqueFolder = typeof crypto.randomUUID === 'function' 
          ? crypto.randomUUID() 
          : Math.random().toString(36).substring(2, 15);
        const filename = sanitizeFilename(file.name);
        const path = `task-submissions/${uniqueFolder}/${filename}`;
        const uploadedPath = await uploadFinanceFileExact(file, path);
        return uploadedPath;
      });
      const uploadedPaths = await Promise.all(uploadPromises);
      const newUrls = uploadedPaths.filter(Boolean);
      submissionUrls = [...existingPaths, ...newUrls].join(',');
    } else {
      submissionUrls = existingPaths.join(',');
    }

    if (isDraft) {
      const { saveTaskDraft } = await import("@/lib/api/tasks");
      const success = await saveTaskDraft(taskId, submissionNote, submissionUrls);
      if (!success) {
        throw new Error("Failed to save draft to the server.");
      }

      // Update tasks state
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId
            ? {
                ...t,
                submissionNote,
                submissionUrls
              }
            : t
        )
      );

      // Update selectedTask state
      setSelectedTask(prevSelected =>
        prevSelected && prevSelected.id === taskId
          ? {
              ...prevSelected,
              submissionNote,
              submissionUrls
            }
          : prevSelected
      );
    } else {
      // 2. Call submitTask API
      const { submitTask } = await import("@/lib/api/tasks");
      const success = await submitTask(taskId, submissionNote, submissionUrls);
      if (!success) {
        throw new Error("Failed to submit task to the server.");
      }

      // 3. Update tasks state
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId
            ? {
                ...t,
                status: "submitted" as StatusType,
                submissionNote,
                submissionUrls
              }
            : t
        )
      );

      // 4. Update selectedTask state
      setSelectedTask(prevSelected =>
        prevSelected && prevSelected.id === taskId
          ? {
              ...prevSelected,
              status: "submitted" as StatusType,
              submissionNote,
              submissionUrls
            }
          : prevSelected
      );

    }

    if (isDraft) {
      return submissionUrls;
    }

    // 5. Send status update notifications
    try {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const changerName = profile?.full_name || "Adidaya Member";
        const changerId = profile?.id;
        const projCode = task.projectCode || "PRG";
        
        const description = `${changerName} submitted the task "${task.title}" for review . ${projCode}`;

        const recipientIds = new Set<string>();
        if (task.createdBy && task.createdBy !== changerId) {
          recipientIds.add(task.createdBy);
        }

        people.forEach(p => {
          const role = (p.role || "").toLowerCase();
          if (["superadmin", "admin", "administrator", "supervisor"].includes(role) && p.id !== changerId) {
            recipientIds.add(p.id);
          }
        });

        for (const recipientId of Array.from(recipientIds)) {
          await createNotification({
            user_id: recipientId,
            type: "info",
            category: "task",
            title: "Task Submitted for Review",
            description,
            link: `/task?id=${task.id}`,
            metadata: { taskId: task.id, newStatus: "submitted" }
          });
        }
      }
    } catch (nErr) {
      console.error("Failed to send submission notifications:", nErr);
    }

    return submissionUrls;
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 20);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || isAddingTask) return;

    setIsAddingTask(true);
    try {
      const proj = dbProjects.find(p => p.projectCode === newTaskProject);
      if (!proj) {
        console.error("Project not found for code:", newTaskProject);
        alert("Selected project not found.");
        return;
      }

      const currentUserId = profile?.id || null;
      if (!currentUserId) {
        console.error("Cannot create task: User profile not loaded.");
        alert("User profile not loaded. Please log in.");
        return;
      }

      // 1. Resolve or Create WBS Item dynamically
      let matchedWbsId = null;
      const constructedWbsCode = `${wbsDiscipline}.${wbsSection.split('.').pop()}`;
      
      const { data: wbsItems, error: wbsErr } = await supabase
        .from("project_wbs_items")
        .select("id")
        .eq("project_id", proj.id)
        .eq("wbs_code", constructedWbsCode);

      if (wbsItems && wbsItems.length > 0) {
        matchedWbsId = wbsItems[0].id;
      } else {
        // Automatically create WBS item since it is a template SAMEPIL
        const title = WBS_TEMPLATES.find(d => d.code === wbsDiscipline)
          ?.sections.find(s => s.code === wbsSection)?.name || "WBS Item";

        const { data: newWbs, error: newWbsErr } = await supabase
          .from("project_wbs_items")
          .insert({
            project_id: proj.id,
            wbs_code: constructedWbsCode,
            title: title,
            level: 3,
            is_leaf: true,
            position: 0
          })
          .select()
          .single();

        if (newWbs) {
          matchedWbsId = newWbs.id;
        } else {
          console.warn("WBS auto-creation returned null, proceeding without WBS link", newWbsErr);
        }
      }

      // 2. Upload multiple selected files to Storage
      let attachmentUrlsString = "";
      if (proofFiles.length > 0) {
        const uploadPromises = proofFiles.map(async (file) => {
          const uniqueFolder = typeof crypto.randomUUID === 'function' 
            ? crypto.randomUUID() 
            : Math.random().toString(36).substring(2, 15);
          const filename = sanitizeFilename(file.name);
          const path = `tasks/${uniqueFolder}/${filename}`;
          const uploadedPath = await uploadFinanceFileExact(file, path);
          return uploadedPath;
        });

        const uploadedPaths = await Promise.all(uploadPromises);
        attachmentUrlsString = uploadedPaths.filter(Boolean).join(',');
      }

      // 3. Assemble and Insert the new Task
      const newTaskDbPayload = {
        title: newTaskTitle,
        description: newTaskDescription,
        projectId: proj.id,
        wbsId: matchedWbsId,
        deadlineDate: newTaskDeadlineDate,
        deadlineTime: newTaskDeadlineTime || null,
        status: newTaskStatus,
        priority: newTaskPriority,
        createdBy: currentUserId,
        attachmentUrls: attachmentUrlsString || null,
        subtasks: subtasks.map((st, idx) => ({
          id: `sub-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          label: st,
          done: false
        }))
      };

      console.log("Creating task with payload:", newTaskDbPayload, "and assignees:", validAssignees);

      const createdTask = await createTask(newTaskDbPayload, validAssignees);

      if (createdTask) {
        const newTaskAvatars = validAssignees.map(uid => {
          const p = people.find(person => person.id === uid);
          if (p?.name) {
            return p.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
          }
          return "U";
        });

        const newTaskAssigneeNames = validAssignees.map(uid => {
          const p = people.find(person => person.id === uid);
          return p?.name || "Unknown User";
        });

        const newTask: TaskItem = {
          id: createdTask.id,
          refId: createdTask.wbsCode || createdTask.wbsTitle || constructedWbsCode || undefined,
          title: createdTask.title,
          projectCode: createdTask.projectCode || proj.projectCode,
          projectName: createdTask.projectName || proj.projectName,
          date: createdTask.deadlineDate,
          time: createdTask.deadlineTime || undefined,
          status: createdTask.status as StatusType,
          priority: createdTask.priority as PriorityType,
          icon: "fileText",
          avatars: newTaskAvatars.length > 0 ? newTaskAvatars : ["U"],
          theme: "pink",
          createdBy: createdTask.createdBy,
          description: createdTask.description || undefined,
          assignees: validAssignees,
          assigneeNames: newTaskAssigneeNames,
          attachmentUrls: createdTask.attachmentUrls || null,
          taskNumber: createdTask.taskNumber || null,
          submissionNote: createdTask.submissionNote || null,
          submissionUrls: createdTask.submissionUrls || null,
          subtasks: createdTask.subtasks || []
        };

        setTasks([newTask, ...tasks]);

        // Asynchronously dispatch task assignment notifications
        (async () => {
          try {
            const assignerName = profile?.full_name || "Adidaya Admin";
            const projCode = createdTask.projectCode || proj?.projectCode || "PRG";
            
            for (const targetUserId of validAssignees) {
              const otherAssigneesNames = validAssignees
                .filter(id => id !== targetUserId)
                .map(id => {
                  const p = people.find(person => person.id === id);
                  return p?.name ? p.name.trim().split(" ")[0] : null;
                })
                .filter(Boolean) as string[];

              let assigneesPhrase = "you";
              if (otherAssigneesNames.length === 1) {
                assigneesPhrase = `you and ${otherAssigneesNames[0]}`;
              } else if (otherAssigneesNames.length > 1) {
                const last = otherAssigneesNames.pop();
                assigneesPhrase = `you, ${otherAssigneesNames.join(", ")}, and ${last}`;
              }

              const description = `${assignerName} assigned ${assigneesPhrase} a task of ${createdTask.title} . ${projCode}`;

              await createNotification({
                user_id: targetUserId,
                type: "mention",
                category: "task",
                title: "New Task Assigned",
                description,
                link: `/task?id=${createdTask.id}`,
                metadata: { taskId: createdTask.id, projectId: proj?.id }
              });
            }
          } catch (nErr) {
            console.error("Failed to send task assignment notifications:", nErr);
          }
        })();

        // Reset form completely
        setNewTaskTitle("");
        setNewTaskDescription("");
        setNewTaskAssignees([]);
        setProofFiles([]);
        setNewTaskDeadlineTime("");
        setSubtasks([]);
        setSelectedModule(null);
        setIsAddOpen(false);
      } else {
        console.error("Task creation failed: createTask returned null");
        alert("Failed to save task in the database.");
      }
    } catch (error) {
      console.error("Failed to create task in handleAddTask:", error);
      alert("An unexpected error occurred while creating task.");
    } finally {
      setIsAddingTask(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    // 1. Tab Filter
    let tabMatch = false;
    if (activeTab === "all") tabMatch = true;
    else if (activeTab === "revision" && t.status === "revision") tabMatch = true;
    else if (activeTab === "active" && t.status === "in_progress") tabMatch = true;
    else if (activeTab === "done" && t.status === "done") tabMatch = true;
    // (Other tabs as needed...)

    // 2. Project Filter
    let projMatch = filterProject === "All" || t.projectCode === filterProject;

    // 3. Date Filter (Simplified mock logic)
    let dateMatch = filterDate === "All" || t.date === filterDate;

    return tabMatch && projMatch && dateMatch;
  });

  return (
    <div className="bg-transparent p-0 transition-colors">
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
            <div className="flex items-center justify-between gap-4 pt-0">
              <div className="flex flex-col gap-1 mb-0">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight leading-none">
                  Tasks
                </h1>
              </div>
              <div className="flex items-center gap-2 font-medium">
                {/* Global actions moved to useHeader */}
              </div>
            </div>
            {/* Desktop/iPad Pill Tabs - Hidden on Desktop (lg+) as requested because sidebar is present */}
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
          className="space-y-6 animate-in fade-in duration-500 md:px-0"
        >
          {/* Mobile Header - With Premium Scrolling Minimize behavior */}
          <div className="md:hidden">
            <ModuleMobileHeader
              title="Tasks"
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
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white shadow-[0_0_0_2px_white] dark:shadow-[0_0_0_2px_#171717]"></span>
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

          {/* TASK LIST AREA */}
          <div className="relative z-0 px-5 lg:px-0">
            {filteredTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTasks.map((task) => (
                  <div key={task.id} onClick={() => setSelectedTask(task)} className="cursor-pointer active:scale-[0.98] transition-all hover:translate-y-[-2px]">
                    <TaskCard task={task} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[40vh] flex flex-col items-center justify-center text-center px-5">
                <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-80" />
                </div>
                <h2 className="text-[18px] font-bold text-neutral-900 dark:text-white mb-2">You're all caught up!</h2>
                <p className="text-[14px] font-medium text-neutral-500 dark:text-neutral-400 max-w-[220px] leading-relaxed opacity-80">
                  No tasks on your plate right now. Enjoy the breather.
                </p>
              </div>
            )}
          </div>
        </div>
      </PageWrapper>

      {/* TASK DETAIL MODAL */}
      <TaskDetailModal
        isOpen={!!selectedTask}
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        profile={profile}
        people={people}
        onDeleteTask={handleDeleteTask}
        onStatusUpdate={handleStatusUpdate}
        onSubmitTask={onSubmitTask}
        onSubtasksUpdate={handleSubtasksUpdate}
      />

      {/* FILTER MODAL */}
      {isFilterOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-[90] transition-all duration-500"
            onClick={() => setIsFilterOpen(false)}
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
            <div className="flex items-center justify-between px-8 py-6 relative z-10">
              <h3 className="text-[22px] font-bold text-neutral-900 tracking-tight">
                Filter Tasks
              </h3>
              <button onClick={() => setIsFilterOpen(false)} className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-xl border border-black/5 flex items-center justify-center text-neutral-400 hover:text-neutral-900 active:scale-95 transition-all shadow-sm">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto px-8 py-2 pb-8 space-y-8 relative z-10">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2 block mb-1.5">Project</label>
                  <div className="relative w-full">
                    <select
                      value={filterProject}
                      onChange={(e) => setFilterProject(e.target.value)}
                      className="w-full bg-white/40 backdrop-blur-md border border-black/5 rounded-full h-11 text-[14px] font-medium text-neutral-800 px-5 appearance-none cursor-pointer outline-none focus:bg-white focus:border-blue-200 transition-all font-sans"
                    >
                      <option value="All">All Projects</option>
                      {dbProjects.map(proj => (
                        <option key={proj.id} value={proj.projectCode}>
                          {proj.projectCode} - {proj.projectName}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-300">
                      <ChevronDown size={20} strokeWidth={1.5} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2 block mb-3">Specific Date</label>
                  <div className="flex flex-wrap gap-2 px-1">
                    {["All", "2026-02-15", "2026-02-21", "2026-02-22", "2026-02-26"].map(d => (
                      <button
                        key={d}
                        onClick={() => setFilterDate(d)}
                        className={`px-5 py-2.5 rounded-full text-[13px] font-bold transition-all ${filterDate === d
                          ? "bg-neutral-900 text-white shadow-lg shadow-black/10 scale-[1.02]"
                          : "bg-white/50 backdrop-blur-xl text-neutral-500 border border-black/5 hover:bg-white active:scale-95"}`}
                      >
                        {d === "All" ? "Any Date" : d.slice(5)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="px-8 pb-10 pt-4 flex gap-3 relative z-10">
              <button
                onClick={() => { setFilterProject("All"); setFilterDate("All"); setIsFilterOpen(false); }}
                className="flex-1 bg-white/50 backdrop-blur-xl border border-black/5 h-[64px] rounded-full font-bold text-[17px] text-neutral-700 active:scale-[0.98] transition-all"
              >
                Clear
              </button>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 bg-blue-500 text-white h-[64px] rounded-full font-bold text-[17px] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/30 border border-white/20"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}

      {/* ADD TASK MODAL */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-[150] isolate">
            {/* BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm"
              onClick={() => setIsAddOpen(false)}
            />

            {/* DRAWER CONTAINER */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
              className={clsx(
                "absolute z-50 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-3xl border border-white/40 dark:border-neutral-800 shadow-2xl rounded-[40px] overflow-hidden flex flex-col",
                "bottom-2 left-2 right-2 top-20 sm:top-6 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[500px]"
              )}
            >
              {/* STICKY HEADER */}
              <div className="flex-none px-8 pt-8 pb-4 sticky top-0 z-20 bg-transparent flex items-center justify-between">
                <h2 className="text-[22px] font-extrabold text-neutral-900 dark:text-white tracking-tight">Add New Task</h2>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="w-10 h-10 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                >
                  <X size={20} className="text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
                </button>
              </div>

              {/* SCROLLABLE CONTENT */}
              <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                <div className="px-8 pb-32 space-y-6 pt-4">
                  
                  {/* Task Title Input */}
                  <div>
                    <label className="block text-[13px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                      Task Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Wall Finishing"
                      className="w-full h-12 px-5 text-sm border-0 rounded-[16px] bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                    />
                  </div>

                  {/* Project Selector Trigger */}
                  <div className="relative">
                    <label className="block text-[13px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                      Project
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                      className="w-full h-12 px-5 flex items-center justify-between border-0 rounded-[16px] bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-extrabold text-white bg-blue-600 dark:bg-blue-500 px-2 py-0.5 rounded-full tracking-wider uppercase">
                          {newTaskProject}
                        </span>
                        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                          {dbProjects.find(p => p.projectCode === newTaskProject)?.projectName || "Select Project..."}
                        </span>
                      </div>
                      <ChevronDown size={16} className="text-neutral-400" />
                    </button>
                    
                    {isProjectDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[16px] shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                        {dbProjects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setNewTaskProject(p.projectCode);
                              setIsProjectDropdownOpen(false);
                            }}
                            className="w-full h-11 px-4 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-colors text-left border-b border-neutral-100 last:border-0 dark:border-neutral-800/50"
                          >
                            <span className="text-[10px] font-extrabold text-white bg-blue-600 dark:bg-blue-500 px-2 py-0.5 rounded-full tracking-wider uppercase shrink-0">
                              {p.projectCode}
                            </span>
                            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 truncate">
                              {p.projectName}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* WBS STEP SELECTORS */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                        WBS - Discipline
                      </label>
                      <select
                        value={wbsDiscipline}
                        onChange={(e) => {
                          const d = e.target.value;
                          setWbsDiscipline(d);
                          const defaultSec = WBS_TEMPLATES.find(t => t.code === d)?.sections[0]?.code || "";
                          setWbsSection(defaultSec);
                        }}
                        className="w-full h-12 px-5 text-sm border-0 rounded-[16px] bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold cursor-pointer"
                      >
                        {WBS_TEMPLATES.map(t => (
                          <option key={t.code} value={t.code}>{t.code} - {t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[13px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                        WBS - Section
                      </label>
                      <select
                        value={wbsSection}
                        onChange={(e) => setWbsSection(e.target.value)}
                        className="w-full h-12 px-5 text-sm border-0 rounded-[16px] bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold cursor-pointer"
                      >
                        {WBS_TEMPLATES.find(t => t.code === wbsDiscipline)?.sections.map(s => (
                          <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Live preview of constructed WBS tag */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider">
                        Dynamic WBS Code:
                      </span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 px-3 py-1 rounded-full uppercase tracking-wider">
                        {wbsDiscipline}.{wbsSection.split('.').pop()}
                      </span>
                    </div>
                  </div>

                  {/* Segmented Priority selector */}
                  <div>
                    <label className="block text-[13px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                      Priority
                    </label>
                    <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-[16px] gap-1">
                      {[
                        { id: "urgent", label: "Urgent", icon: AlertCircle, color: "bg-red-500 text-white shadow-md border-red-500" },
                        { id: "high", label: "High", icon: ArrowUp, color: "bg-orange-500 text-white shadow-md border-orange-500" },
                        { id: "medium", label: "Medium", icon: Menu, color: "bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-600 shadow-sm" },
                        { id: "low", label: "Low", icon: ArrowDown, color: "bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-600 shadow-sm" }
                      ].map((opt) => {
                        const isSel = newTaskPriority === opt.id;
                        const OptIcon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setNewTaskPriority(opt.id as TaskPriority)}
                            className={clsx(
                              "flex-1 h-9 rounded-[12px] flex items-center justify-center gap-1.5 text-xs font-bold transition-all",
                              isSel
                                ? opt.color + " font-extrabold"
                                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                            )}
                          >
                            <OptIcon size={14} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Deadline date picker */}
                  <div>
                    <label className="block text-[13px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                      Deadline (Date & Optional Time)
                    </label>
                    <div className="flex gap-4">
                      <div className="flex-1 relative">
                        <input
                          type="date"
                          className="w-full h-12 px-5 text-sm border-0 rounded-[16px] bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold"
                          value={newTaskDeadlineDate}
                          onChange={(e) => setNewTaskDeadlineDate(e.target.value)}
                        />
                      </div>
                      <div className="flex-1 relative">
                        <input
                          type="time"
                          className="w-full h-12 px-5 text-sm border-0 rounded-[16px] bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold"
                          value={newTaskDeadlineTime}
                          onChange={(e) => setNewTaskDeadlineTime(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Assignees selection with search & badges */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        Assignees
                      </label>
                      {newTaskAssignees.length > 0 && (
                        <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                          {newTaskAssignees.length} selected
                        </span>
                      )}
                    </div>

                    {/* Selected Assignees Badges Above Search Input */}
                    {newTaskAssignees.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2.5 bg-neutral-50 dark:bg-neutral-900/30 rounded-[16px] border border-black/[0.03] dark:border-white/[0.03]">
                        {newTaskAssignees.map(id => {
                          const p = people.find(person => person.id === id);
                          if (!p) return null;
                          const initials = p.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .substring(0, 2);
                          return (
                            <div
                              key={p.id}
                              className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full shadow-sm"
                            >
                              <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-[9px] font-extrabold text-blue-600 dark:text-blue-400 shrink-0">
                                {initials}
                              </div>
                              <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                                {p.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => setNewTaskAssignees(newTaskAssignees.filter(uid => uid !== p.id))}
                                className="w-4 h-4 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-red-500 transition-colors"
                              >
                                <X size={10} strokeWidth={2.5} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Search Field */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search team members..."
                        value={assigneeSearchQuery}
                        onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                        className="w-full h-11 px-4 pr-10 text-xs border-0 rounded-[16px] bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold placeholder:text-neutral-400"
                      />
                      <Search size={16} className="absolute right-3.5 top-3.5 text-neutral-400 pointer-events-none" />
                    </div>

                    {/* Filtered Search Results Grid */}
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 no-scrollbar border border-black/[0.02] dark:border-white/[0.02] p-1.5 rounded-[16px]">
                      {people.filter(p => p.name.toLowerCase().includes(assigneeSearchQuery.toLowerCase())).length > 0 ? (
                        people
                          .filter(p => p.name.toLowerCase().includes(assigneeSearchQuery.toLowerCase()))
                          .map((p) => {
                            const isAssigned = newTaskAssignees.includes(p.id);
                            const initials = p.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .substring(0, 2);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  if (isAssigned) {
                                    setNewTaskAssignees(newTaskAssignees.filter(id => id !== p.id));
                                  } else {
                                    setNewTaskAssignees([...newTaskAssignees, p.id]);
                                  }
                                }}
                                className={clsx(
                                  "flex items-center gap-2 p-2 rounded-[14px] border text-left transition-all active:scale-[0.98]",
                                  isAssigned
                                    ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-400 dark:border-blue-900 text-blue-600 dark:text-blue-400 font-bold"
                                    : "bg-neutral-100/50 dark:bg-neutral-800/40 border-transparent hover:bg-neutral-100 text-neutral-700 dark:text-neutral-300"
                                )}
                              >
                                <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[9px] font-extrabold text-neutral-700 dark:text-neutral-300 shrink-0">
                                  {initials}
                                </div>
                                <span className="text-xs font-semibold truncate leading-none">
                                  {p.name}
                                </span>
                                {isAssigned && <Check size={12} strokeWidth={2.5} className="ml-auto shrink-0" />}
                              </button>
                            );
                          })
                      ) : (
                        <div className="col-span-2 text-center py-4 text-xs font-semibold text-neutral-400 dark:text-neutral-500 italic">
                          No matching team members found
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Subtasks Section with Inline Input */}
                  <div className="space-y-3">
                    <label className="block text-[13px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                      Subtasks (Optional)
                    </label>

                    {/* Inline Input bar */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add new subtask..."
                        value={subtaskInputValue}
                        onChange={(e) => setSubtaskInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (subtaskInputValue.trim()) {
                              setSubtasks([...subtasks, subtaskInputValue.trim()]);
                              setSubtaskInputValue("");
                            }
                          }
                        }}
                        className="flex-1 h-11 px-4 text-xs border-0 rounded-[16px] bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold placeholder:text-neutral-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (subtaskInputValue.trim()) {
                            setSubtasks([...subtasks, subtaskInputValue.trim()]);
                            setSubtaskInputValue("");
                          }
                        }}
                        className="w-11 h-11 rounded-[16px] bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center active:scale-95 transition-transform shrink-0 shadow-md shadow-blue-500/25"
                      >
                        <Plus size={16} strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Subtask list */}
                    {subtasks.length > 0 && (
                      <div className="space-y-2 bg-neutral-50 dark:bg-neutral-900/40 p-3 rounded-[16px] border border-black/5">
                        {subtasks.map((st, sIdx) => (
                          <div key={sIdx} className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300 px-1">
                            <div className="flex items-center gap-2">
                              <Check size={14} className="text-emerald-500 shrink-0" />
                              <span className="truncate">{st}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSubtasks(subtasks.filter((_, i) => i !== sIdx))}
                              className="text-neutral-400 hover:text-red-500 p-1 rounded-full transition-colors"
                              title="Delete subtask"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Optional Module linking horizontal row */}
                  <div>
                    <label className="block text-[13px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                      Link to Module (Optional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "finance", label: "Finance", icon: CreditCard },
                        { id: "resource", label: "Resource", icon: Layers },
                        { id: "people", label: "People", icon: Users },
                        { id: "clock", label: "Clock", icon: Clock },
                        { id: "crew", label: "Crew", icon: Wrench }
                      ].map((mod) => {
                        const isSel = selectedModule === mod.id;
                        const ModIcon = mod.icon;
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => setSelectedModule(isSel ? null : mod.id)}
                            className={clsx(
                              "flex items-center gap-1.5 px-4 py-2 rounded-full border transition-all text-xs font-bold",
                              isSel
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-neutral-100/80 dark:bg-neutral-800/80 border-black/5 hover:bg-neutral-200/50 text-neutral-700 dark:text-neutral-300"
                            )}
                          >
                            <ModIcon size={14} />
                            {mod.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Description Input textarea */}
                  <div>
                    <label className="block text-[13px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                      Description
                    </label>
                    <textarea
                      placeholder="Additional notes..."
                      className="w-full h-24 p-4 text-sm border-0 rounded-[16px] bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold placeholder:text-neutral-400 placeholder:font-medium resize-none"
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                    />
                  </div>

                  {/* Attach Files (Placed strictly at the very end of the scrollable area as requested) */}
                  <div>
                    <label className="block text-[13px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                      Attach Files
                    </label>
                    
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-[16px] bg-neutral-100/40 dark:bg-neutral-800/40 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 transition-all cursor-pointer group mb-3">
                      <div className="flex items-center gap-3">
                        <UploadCloud className="w-5 h-5 text-neutral-400 group-hover:text-blue-500 transition-colors" />
                        <span className="text-xs font-bold text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
                          Tap to upload multiple files
                        </span>
                      </div>
                      <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files) {
                            const selectedFiles = Array.from(e.target.files);
                            setProofFiles(prev => [...prev, ...selectedFiles]);
                          }
                        }} 
                      />
                    </label>

                    {proofFiles.length > 0 && (
                      <div className="space-y-2">
                        {proofFiles.map((file, fIdx) => (
                          <div 
                            key={fIdx} 
                            className="flex items-center justify-between p-2.5 pl-3.5 bg-neutral-50 dark:bg-neutral-800/40 border border-black/5 dark:border-white/5 rounded-[16px] text-xs shadow-sm"
                          >
                            <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span className="text-neutral-700 dark:text-neutral-300 font-semibold truncate">
                                {file.name}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-medium shrink-0">
                                ({(file.size / 1024).toFixed(0)} KB)
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const blobUrl = URL.createObjectURL(file);
                                  window.open(blobUrl, '_blank');
                                }}
                                className="text-[10.5px] font-bold text-blue-600 bg-blue-50/80 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors active:scale-95 duration-150"
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                onClick={() => setProofFiles(prev => prev.filter((_, idx) => idx !== fIdx))}
                                className="w-6 h-6 rounded-md bg-red-50 dark:bg-red-950/20 text-red-500 hover:text-red-700 dark:hover:text-red-400 flex items-center justify-center transition-all active:scale-90"
                                title="Remove file"
                              >
                                <X size={14} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* STICKY GLASSY FOOTER */}
              <div className="absolute bottom-0 left-0 right-0 w-full px-8 pb-8 pt-4 z-30 bg-transparent flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  disabled={isAddingTask}
                  className="flex-1 h-12 rounded-full bg-white/10 dark:bg-neutral-800/10 border border-black/5 dark:border-white/5 text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:bg-white/20 dark:hover:bg-neutral-800/20 transition-all active:scale-[0.97] flex items-center justify-center disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim() || validAssignees.length === 0 || !profile || isAddingTask}
                  className="flex-[2] h-12 rounded-full bg-blue-600 dark:bg-blue-500 text-white text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 dark:shadow-blue-500/15 transition-all active:scale-[0.97] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 border border-white/10"
                >
                  {isAddingTask ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Saving Task...
                    </>
                  ) : !profile ? (
                    "Loading Profile..."
                  ) : (
                    <>
                      <Plus size={18} strokeWidth={2.5} /> Create Task
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
