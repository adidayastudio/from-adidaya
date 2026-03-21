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
  Search,
  Filter
} from "lucide-react";
import { fetchAllProjects, fetchProjectWBS } from "@/lib/api/projects";
import { fetchAllTasks, createTask } from "@/lib/api/tasks";
import { fetchPeopleDirectory } from "@/lib/api/people";
import { Person } from "@/components/feel/people/types";
import { Project, WBSItem } from "@/types/project";
import { TaskStatus, TaskPriority } from "@/types/task";
import { Select } from "@/shared/ui/primitives/select/select";
import useUserProfile from "@/hooks/useUserProfile";
import PageWrapper from "@/components/layout/PageWrapper";
import TabSidebar, { TabItem as SidebarTabItem } from "@/components/sidebar/TabSidebar";
import { useHeader } from "@/components/providers/HeaderProvider";
import ModuleMobileHeader from "@/components/layout/ModuleMobileHeader";

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

const getStatusStyles = (status: StatusType, priority: PriorityType) => {
  let statusBadge = "";
  if (status === "TODO") statusBadge = "bg-white/60 text-gray-500 font-medium";
  else if (status === "REVISION") statusBadge = "bg-[#fde2c9] text-[#f29f4b] font-bold";
  else if (status === "IN PROGRESS") statusBadge = "bg-[#d4e1f8] text-[#5485ea] font-bold";
  else if (status === "DONE") statusBadge = "bg-[#cfead4] text-[#4cb05f] font-bold";

  let priorityBadge = "";
  if (priority === "URGENT") priorityBadge = "bg-[#f7d4dc] text-[#eb5275] font-bold";
  else if (priority === "HIGH") priorityBadge = "bg-[#f7d4dc] text-[#eb5275] font-bold"; // Optional: can adjust specific red shade
  else if (priority === "MEDIUM") priorityBadge = "bg-[#fde2c9] text-[#f29f4b] font-bold";
  else priorityBadge = "bg-[#e4e4e7] text-[#71717a] font-bold";

  return { statusBadge, priorityBadge };
};

const TaskDetailModal = ({
  task,
  isOpen,
  onClose,
}: {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen || !task) return null;

  const tStyles = getThemeStyles(task.theme);
  const { statusBadge, priorityBadge } = getStatusStyles(task.status, task.priority);
  const IconComponent =
    task.icon === "users" ? Users : task.icon === "fileText" ? FileText : CreditCard;

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
        <div className="flex items-center justify-between px-8 py-6 relative z-10">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase ${statusBadge}`}>
                {task.status}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase ${priorityBadge}`}>
                {task.priority}
              </span>
            </div>
            <h3 className="text-[22px] font-bold text-neutral-900 tracking-tight mt-1">
              Task Details
            </h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-xl border border-black/5 flex items-center justify-center text-neutral-400 hover:text-neutral-900 active:scale-95 transition-all shadow-sm">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-8 py-2 pb-8 space-y-8 relative z-10">
          {/* Main Info */}
          <div className="flex gap-5">
            <div className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${tStyles.iconBg}`}>
              <IconComponent size={32} className={tStyles.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              {task.refId && (
                <div className="text-[11px] font-bold text-orange-500 tracking-[0.2em] uppercase mb-1">
                  {task.refId}
                </div>
              )}
              <h2 className="text-[20px] font-bold text-neutral-900 leading-tight mb-2 truncate">
                {task.title}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-blue-500 bg-blue-50/50 border border-blue-100 px-2 py-0.5 rounded-full shadow-sm tracking-wider">
                  {task.projectCode}
                </span>
                <span className="text-[14px] text-neutral-400 font-medium truncate">
                  {task.projectName}
                </span>
              </div>
            </div>
          </div>

          {/* Details Table-style Grid */}
          <div className="bg-white/40 backdrop-blur-md rounded-[32px] border border-black/5 overflow-hidden">
            <div className="px-6 py-5 flex items-center justify-between border-b border-black/[0.03]">
              <div className="flex items-center gap-3 text-neutral-400 text-[13px] font-bold uppercase tracking-wider">
                <Calendar size={16} strokeWidth={2} /> Date
              </div>
              <div className="text-[15px] font-bold text-neutral-800">{task.date}</div>
            </div>
            {task.time && (
              <div className="px-6 py-5 flex items-center justify-between border-b border-black/[0.03]">
                <div className="flex items-center gap-3 text-neutral-400 text-[13px] font-bold uppercase tracking-wider">
                  <Clock size={16} strokeWidth={2} /> Time
                </div>
                <div className="text-[15px] font-bold text-neutral-800">{task.time}</div>
              </div>
            )}
            <div className="px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3 text-neutral-400 text-[13px] font-bold uppercase tracking-wider">
                <Users size={16} strokeWidth={2} /> Assignees
              </div>
              <div className="flex items-center -space-x-2">
                {task.avatars.map((av, idx) => (
                  <div
                    key={idx}
                    className={`w-[32px] h-[32px] rounded-full text-[11px] font-bold flex items-center justify-center border-2 border-white shadow-sm transition-transform hover:scale-110 relative z-[${10 - idx}] ${av.includes("+") ? "bg-neutral-100 text-neutral-600" : "bg-gradient-to-br from-white to-neutral-50 text-neutral-800"
                      }`}
                  >
                    {av}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="px-2">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] block mb-3">
              Task Description
            </label>
            <div className="bg-white/40 backdrop-blur-md rounded-[32px] border border-black/5 p-6">
              <p className="text-[15px] text-neutral-600 leading-[1.6] font-medium">
                This task needs immediate attention. Please review the documents attached and proceed with the necessary approvals before the deadline to ensure project continuity.
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-8 pb-10 pt-4 flex flex-col gap-3 relative z-10">
          {task.status === "TODO" && (
            <button className="w-full bg-neutral-900 text-white h-[64px] rounded-full font-bold text-[17px] active:scale-[0.98] transition-all shadow-xl shadow-black/10 border border-white/10">
              Start Task
            </button>
          )}
          {task.status === "IN PROGRESS" && (
            <button className="w-full bg-emerald-500 text-white h-[64px] rounded-full font-bold text-[17px] active:scale-[0.98] transition-all shadow-xl shadow-emerald-500/30 border border-white/20">
              Submit for Review
            </button>
          )}
          {(task.status === "REVISION" || task.status === "DONE") && (
            <div className="flex gap-3">
              <button className="flex-1 bg-white/50 backdrop-blur-xl border border-black/5 h-[64px] rounded-full font-bold text-[17px] text-neutral-700 active:scale-[0.98] transition-all">
                Edit Form
              </button>
              <button className="flex-1 bg-neutral-900 text-white h-[64px] rounded-full font-bold text-[17px] active:scale-[0.98] transition-all shadow-xl shadow-black/10 border border-white/10">
                Resubmit
              </button>
            </div>
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
          {(task.refId || task.subtaskIndicator) && (
            <div className="flex items-center gap-2 mb-1">
              {task.refId && (
                <span className="text-[11px] font-bold text-gray-500 tracking-wide uppercase">
                  {task.refId}
                </span>
              )}
              {task.subtaskIndicator && (
                <div className="flex items-center gap-1 bg-black/5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-gray-600">
                  <ListTodo size={10} />
                  <span>{task.subtaskIndicator}</span>
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
          <span className={`text-[9px] px-2 py-0.5 rounded-full tracking-wider ${statusBadge}`}>
            {task.status}
          </span>
          <span className={`text-[9px] px-2 py-0.5 rounded-full tracking-wider ${priorityBadge}`}>
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

const flattenWBS = (items: WBSItem[], level: number = 0): any[] => {
  const result: any[] = [];
  items.forEach(item => {
    result.push({ ...item, displayTitle: item.title, level });
    if (item.children && item.children.length > 0) {
      result.push(...flattenWBS(item.children, level + 1));
    }
  });
  return result;
};



export default function TaskPage() {
  const { profile, loading: profileLoading } = useUserProfile();

  // Add form state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("PRG");
  const [newTaskWBS, setNewTaskWBS] = useState("");
  const [newTaskDeadlineDate, setNewTaskDeadlineDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskDeadlineTime, setNewTaskDeadlineTime] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("TODO");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskFile, setNewTaskFile] = useState<File | null>(null);

  // Other UI state
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [dbProjects, setDbProjects] = useState<Project[]>([]);
  const [wbsList, setWbsList] = useState<WBSItem[]>([]);
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
            return p.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
          }
          return "U";
        }) || ["U"];

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

  // Fetch WBS when project changes
  useEffect(() => {
    async function loadWBS() {
      if (!newTaskProject) return;
      const proj = dbProjects.find(p => p.projectCode === newTaskProject);
      if (proj) {
        const wbs = await fetchProjectWBS(proj.id);
        const flatWbs = flattenWBS(wbs);
        setWbsList(flatWbs);
        if (flatWbs.length > 0) {
          setNewTaskWBS(flatWbs[0].id || "");
        } else {
          setNewTaskWBS("");
        }
      }
    }
    loadWBS();
  }, [newTaskProject, dbProjects]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 20);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const proj = dbProjects.find(p => p.projectCode === newTaskProject);
      if (!proj) {
        console.error("Project not found for code:", newTaskProject);
        return;
      }

      const currentUserId = profile?.id || null;
      if (!currentUserId) {
        console.error("Cannot create task: User profile not loaded.");
        return;
      }

      const newTaskDbPayload = {
        title: newTaskTitle,
        description: newTaskDescription,
        projectId: proj.id,
        wbsId: newTaskWBS || null,
        deadlineDate: newTaskDeadlineDate,
        deadlineTime: newTaskDeadlineTime || null,
        status: newTaskStatus,
        priority: newTaskPriority,
        createdBy: currentUserId
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

        const newTask: TaskItem = {
          id: createdTask.id,
          refId: createdTask.wbsCode || createdTask.wbsTitle || undefined,
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
        };

        setTasks([newTask, ...tasks]);

        // Reset form
        setNewTaskTitle("");
        setNewTaskDescription("");
        setNewTaskAssignees([]);
        setNewTaskFile(null);
        setNewTaskDeadlineTime("");
        setIsAddOpen(false);
      } else {
        console.error("Task creation failed: createTask returned null");
      }
    } catch (error) {
      console.error("Failed to create task in handleAddTask:", error);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    // 1. Tab Filter
    let tabMatch = false;
    if (activeTab === "all") tabMatch = true;
    else if (activeTab === "revision" && t.status === "REVISION") tabMatch = true;
    else if (activeTab === "active" && t.status === "IN PROGRESS") tabMatch = true;
    else if (activeTab === "done" && t.status === "DONE") tabMatch = true;
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
                "absolute z-50 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-3xl border border-white/60 dark:border-neutral-800 shadow-2xl rounded-[56px] overflow-hidden flex flex-col",
                "bottom-2 left-2 right-2 top-20 sm:top-6 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[500px]"
              )}
            >
              {/* STICKY HEADER */}
              <div className="flex-none px-8 pt-8 pb-4 sticky top-0 z-20 bg-transparent flex items-center justify-between">
                <h2 className="text-[22px] font-bold text-neutral-900 dark:text-white tracking-tight">Add New Task</h2>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="w-10 h-10 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                >
                  <X size={20} className="text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
                </button>
              </div>

              {/* SCROLLABLE CONTENT */}
              <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                <div className="px-8 pb-32 space-y-8">
                  {/* SECTION: BASIC INFO */}
                  <section className="space-y-4 pt-4">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-neutral-500" strokeWidth={2} /> Task Information
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">Task Title *</label>
                        <input
                          type="text"
                          placeholder="What needs to be done?"
                          className="w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/[0.08] focus:border-blue-500/20 transition-all font-medium placeholder:text-[11px]"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Select
                          label="Project *"
                          value={newTaskProject}
                          onChange={setNewTaskProject}
                          options={[
                            { label: "Internal Project", value: "INTERNAL" },
                            ...dbProjects.map(p => ({ label: `${p.projectCode} - ${p.projectName}`, value: p.projectCode }))
                          ]}
                        />
                        <Select
                          label="WBS *"
                          value={newTaskWBS}
                          onChange={setNewTaskWBS}
                          options={[
                            { label: "None", value: "" },
                            ...wbsList.map(w => ({ 
                              label: `${"\u00A0".repeat((w.level || 0) * 2)}${w.wbsCode} - ${w.title}`, 
                              value: w.id || "" 
                            }))
                          ]}
                        />
                      </div>

                      <Select
                        label="Assignee"
                        value={newTaskAssignees[0] || ""}
                        onChange={(val) => setNewTaskAssignees([val])}
                        options={people.map(p => ({ label: p.name, value: p.id }))}
                        placeholder="Select someone..."
                      />
                    </div>
                  </section>

                  {/* SECTION: DETAILS */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-neutral-500" strokeWidth={2} /> Priority & Deadline
                    </h3>

                    <div className="space-y-4">
                      <Select
                        label="Priority"
                        value={newTaskPriority}
                        onChange={(val) => setNewTaskPriority(val as PriorityType)}
                        options={[
                          { label: "Low", value: "LOW" },
                          { label: "Medium", value: "MEDIUM" },
                          { label: "High", value: "HIGH" },
                          { label: "Urgent", value: "URGENT" }
                        ]}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">Deadline Date *</label>
                          <input
                            type="date"
                            className="w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/[0.08] focus:border-blue-500/20 transition-all font-medium"
                            value={newTaskDeadlineDate}
                            onChange={(e) => setNewTaskDeadlineDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">Deadline Time</label>
                          <input
                            type="time"
                            className="w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/[0.08] focus:border-blue-500/20 transition-all font-medium"
                            value={newTaskDeadlineTime}
                            onChange={(e) => setNewTaskDeadlineTime(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* SECTION: NOTES & ATTACHMENTS */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <History className="w-4 h-4 text-neutral-500" strokeWidth={2} /> Notes & Attachments
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">Notes</label>
                        <textarea
                          placeholder="Add some details..."
                          className="w-full h-32 p-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-[32px] bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/[0.08] focus:border-blue-500/20 transition-all font-medium placeholder:text-[11px] resize-none"
                          value={newTaskDescription}
                          onChange={(e) => setNewTaskDescription(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">Attachments</label>
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-[32px] bg-white/40 dark:bg-neutral-800/40 hover:bg-white/60 dark:hover:bg-neutral-800/60 transition-all cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <UploadCloud className="w-5 h-5 text-neutral-400 group-hover:text-blue-500 transition-colors" />
                            <span className="text-xs font-bold text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
                              {newTaskFile ? newTaskFile.name : "Tap to upload file"}
                            </span>
                          </div>
                          <input type="file" className="hidden" onChange={(e) => setNewTaskFile(e.target.files?.[0] || null)} />
                        </label>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* STICKY GLASSY FOOTER */}
              <div className="absolute bottom-0 left-0 right-0 w-full px-8 py-6 z-30 bg-transparent">
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                  <button
                    onClick={() => setIsAddOpen(false)}
                    className="flex-1 h-12 rounded-full border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddTask}
                    disabled={!newTaskTitle.trim() || validAssignees.length === 0 || !profile}
                    className="flex-[2] h-12 rounded-full bg-[#0062ff] text-white text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    {!profile ? "Loading Profile..." : (
                      <>
                        <Check size={18} /> Create Task
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
