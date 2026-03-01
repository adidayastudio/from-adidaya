"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
  ChevronDown
} from "lucide-react";
import { fetchAllProjects, fetchProjectWBS } from "@/lib/api/projects";
import { fetchAllTasks, createTask } from "@/lib/api/tasks";
import { Project, WBSItem } from "@/types/project";
import { TaskStatus, TaskPriority } from "@/types/task";

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
              {task.status}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full tracking-wider uppercase ${priorityBadge}`}>
              {task.priority}
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
            <div className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center ${tStyles.iconBg}`}>
              <IconComponent size={28} className={tStyles.iconColor} />
            </div>
            <div className="flex-1">
              {task.refId && (
                <div className="text-[12px] font-bold text-gray-400 tracking-wide uppercase mb-1">
                  {task.refId}
                </div>
              )}
              <h2 className="text-[22px] font-bold text-gray-900 leading-tight mb-2">
                {task.title}
              </h2>
              <div className="flex items-center gap-2">
                <span className="bg-black/5 text-gray-500 text-[11px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                  {task.projectCode}
                </span>
                <span className="text-[14px] text-gray-500 font-medium">
                  {task.projectName}
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="bg-white rounded-2xl p-4 border border-black/5 mb-6">
            <div className="grid border-b border-black/5 pb-4 mb-4 gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500 text-[13px] font-medium">
                  <Calendar size={16} /> Date
                </div>
                <div className="text-[14px] font-bold text-gray-900">{task.date}</div>
              </div>
              {task.time && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500 text-[13px] font-medium">
                    <Clock size={16} /> Time
                  </div>
                  <div className="text-[14px] font-bold text-gray-900">{task.time}</div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-500 text-[13px] font-medium">
                <Users size={16} /> Assignees
              </div>
              <div className="flex items-center">
                {task.avatars.map((av, idx) => (
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

          {/* Description Placeholder */}
          <div className="mb-6">
            <h4 className="text-[15px] font-bold text-gray-900 mb-2">Description</h4>
            <p className="text-[14px] text-gray-500 leading-relaxed">
              This task needs immediate attention. Please review the documents attached and proceed with the necessary approvals before the deadline to ensure project continuity.
            </p>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 bg-white/80 backdrop-blur-md border-t border-black/5 flex gap-3 pb-8 sm:pb-4">
          {task.status === "TODO" && (
            <button className="flex-1 bg-gray-900 hover:bg-black text-white rounded-full py-4 font-bold text-[15px] transition-colors">
              Start Task
            </button>
          )}
          {task.status === "IN PROGRESS" && (
            <button className="flex-1 bg-[#4cb05f] hover:bg-[#3d9e50] text-white rounded-full py-4 font-bold text-[15px] transition-colors">
              Submit for Review
            </button>
          )}
          {(task.status === "REVISION" || task.status === "DONE") && (
            <>
              <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full py-4 font-bold text-[15px] transition-colors">
                Edit Form
              </button>
              <button className="flex-1 bg-gray-900 hover:bg-black text-white rounded-full py-4 font-bold text-[15px] transition-colors">
                Resubmit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
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

export default function TaskPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Database Projects
  const [dbProjects, setDbProjects] = useState<Project[]>([]);

  useEffect(() => {
    async function loadData() {
      const [projectsData, tasksData] = await Promise.all([
        fetchAllProjects(),
        fetchAllTasks()
      ]);
      setDbProjects(projectsData);

      const mappedTasks: TaskItem[] = tasksData.map(t => ({
        id: t.id,
        refId: t.wbsId || undefined,
        title: t.title,
        projectCode: t.projectCode || "UNK",
        projectName: t.projectName || "Unknown Project",
        date: t.deadlineDate,
        time: t.deadlineTime || undefined,
        status: t.status as StatusType,
        priority: t.priority as PriorityType,
        icon: "fileText",
        avatars: t.assignees?.length ? t.assignees : ["U"],
        theme: "pink",
      }));
      setTasks(mappedTasks);
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
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("PRG");
  const [newTaskWBS, setNewTaskWBS] = useState("");
  const [newTaskDeadlineDate, setNewTaskDeadlineDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskDeadlineTime, setNewTaskDeadlineTime] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<StatusType>("TODO");
  const [newTaskPriority, setNewTaskPriority] = useState<PriorityType>("MEDIUM");
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskFile, setNewTaskFile] = useState<File | null>(null);

  // WBS List state
  const [wbsList, setWbsList] = useState<WBSItem[]>([]);

  // Fetch WBS when project changes
  useEffect(() => {
    async function loadWBS() {
      if (!newTaskProject) return;
      // find the project id from the code
      const proj = dbProjects.find(p => p.projectCode === newTaskProject);
      if (proj) {
        const wbs = await fetchProjectWBS(proj.id);
        setWbsList(wbs);
        if (wbs.length > 0) {
          setNewTaskWBS(wbs[0].wbsCode || "");
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

    const proj = dbProjects.find(p => p.projectCode === newTaskProject);
    if (!proj) return;

    const newTaskDbPayload = {
      title: newTaskTitle,
      description: newTaskDescription,
      projectId: proj.id,
      wbsId: newTaskWBS || null,
      deadlineDate: newTaskDeadlineDate,
      deadlineTime: newTaskDeadlineTime || null,
      status: newTaskStatus,
      priority: newTaskPriority,
      createdBy: null // To be replaced with actual user logic if needed
    };

    const createdTask = await createTask(newTaskDbPayload, newTaskAssignees);

    if (createdTask) {
      const newTask: TaskItem = {
        id: createdTask.id,
        refId: createdTask.wbsId || undefined,
        title: createdTask.title,
        projectCode: createdTask.projectCode || proj.projectCode,
        projectName: createdTask.projectName || proj.projectName,
        date: createdTask.deadlineDate,
        time: createdTask.deadlineTime || undefined,
        status: createdTask.status as StatusType,
        priority: createdTask.priority as PriorityType,
        icon: "fileText",
        avatars: newTaskAssignees.length > 0 ? newTaskAssignees : ["U"],
        theme: "pink",
      };

      setTasks([newTask, ...tasks]);
    }

    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskAssignees([]);
    setNewTaskFile(null);
    setNewTaskDeadlineTime("");
    setIsAddOpen(false);
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
    <div
      className="h-[100dvh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-[#f8f9fa] pb-24 relative"
      onScroll={handleScroll}
    >
      {/* HEADER SECTION - STICKY WITH GLASS EFFECT WHEN SCROLLED */}
      <div
        className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled
          ? "bg-[#f8f9fa]/70 backdrop-blur-xl border-b border-black/[0.05] pt-12 pb-3"
          : "bg-[#f8f9fa] pt-14 pb-4"
          } px-5`}
      >
        {/* Top Header Row */}
        <div className={`flex items-center transition-all duration-300 relative ${isScrolled ? "mb-4" : "mb-6"}`}>
          {/* Title */}
          <h1
            className={`font-bold text-gray-900 tracking-tight transition-all duration-300 ease-in-out origin-left ${isScrolled
              ? "text-[18px] absolute left-1/2 -translate-x-1/2"
              : "text-[32px] relative"
              }`}
          >
            Tasks
          </h1>

          {/* Spacer to push right content when title is not absolute */}
          {!isScrolled && <div className="flex-1" />}

          {/* Top Right Action Pills (Menu and Plus) */}
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
                  ? `text-gray-900 font-semibold`
                  : "bg-transparent text-gray-500 font-medium hover:text-gray-700"
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabBadgeTasks"
                    className={`absolute inset-0 rounded-full shadow-sm border border-black/[0.04] ${isScrolled ? "bg-white/60 backdrop-blur-md" : "bg-white"
                      }`}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2">
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[14px]">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* TASKS LIST */}
      <div className="px-5 mt-2 relative z-0">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div key={task.id} onClick={() => setSelectedTask(task)} className="cursor-pointer active:scale-[0.98] transition-transform">
              <TaskCard task={task} />
            </div>
          ))
        ) : (
          <div className="h-[55vh] flex flex-col items-center justify-center text-center">
            {activeTab === "all" && (
              <>
                <div className="w-24 h-24 bg-[#f8f9fa] rounded-full flex items-center justify-center mb-6 shadow-sm border border-[#f0f0f0]">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 opacity-80" />
                </div>
                <h2 className="text-[20px] font-bold text-gray-900 mb-2">You're all caught up!</h2>
                <p className="text-[14px] font-medium text-gray-500 max-w-[220px] leading-relaxed opacity-80">
                  No tasks on your plate right now. Enjoy the breather.
                </p>
              </>
            )}
            {activeTab === "active" && (
              <>
                <div className="w-24 h-24 bg-[#eff4fc] rounded-full flex items-center justify-center mb-6 shadow-sm border border-[#e8effa]">
                  <History className="w-10 h-10 text-[#5485ea] opacity-80" />
                </div>
                <h2 className="text-[20px] font-bold text-gray-900 mb-2">Nothing in progress</h2>
                <p className="text-[14px] font-medium text-gray-500 max-w-[240px] leading-relaxed opacity-80">
                  You have no active tasks at the moment. Ready to start something new?
                </p>
              </>
            )}
            {activeTab === "submitted" && (
              <>
                <div className="w-24 h-24 bg-[#fdf4e8] rounded-full flex items-center justify-center mb-6 shadow-sm border border-[#fde2c9]">
                  <Send className="w-10 h-10 text-[#f29f4b] opacity-80" />
                </div>
                <h2 className="text-[20px] font-bold text-gray-900 mb-2">No pending reviews</h2>
                <p className="text-[14px] font-medium text-gray-500 max-w-[220px] leading-relaxed opacity-80">
                  You haven't submitted any tasks for approval recently.
                </p>
              </>
            )}
            {activeTab === "revision" && (
              <>
                <div className="w-24 h-24 bg-[#fcebef] rounded-full flex items-center justify-center mb-6 shadow-sm border border-[#f7d4dc]">
                  <Undo2 className="w-10 h-10 text-[#eb5275] opacity-80" />
                </div>
                <h2 className="text-[20px] font-bold text-gray-900 mb-2">Great job!</h2>
                <p className="text-[14px] font-medium text-gray-500 max-w-[220px] leading-relaxed opacity-80">
                  None of your tasks were returned for revision. Keep it up!
                </p>
              </>
            )}
            {activeTab === "done" && (
              <>
                <div className="w-24 h-24 bg-[#eaf5ec] rounded-full flex items-center justify-center mb-6 shadow-sm border border-[#cfead4]">
                  <ListTodo className="w-10 h-10 text-[#4cb05f] opacity-80" />
                </div>
                <h2 className="text-[20px] font-bold text-gray-900 mb-2">A clean slate</h2>
                <p className="text-[14px] font-medium text-gray-500 max-w-[220px] leading-relaxed opacity-80">
                  Your completed tasks will appear here. Let's get to work!
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* TASK DETAIL MODAL */}
      <TaskDetailModal
        isOpen={!!selectedTask}
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />

      {/* FILTER MODAL */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setIsFilterOpen(false)} />
          <div className="relative w-full sm:w-[400px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom flex flex-col max-h-[90dvh]">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900">Filter Tasks</h3>
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
                  {["All", "2026-02-15", "2026-02-21", "2026-02-22", "2026-02-26"].map(d => (
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

      {/* ADD TASK MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setIsAddOpen(false)} />
          <div className="relative w-full sm:w-[400px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom flex flex-col max-h-[90dvh]">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900">New Task</h3>
              <button onClick={() => setIsAddOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex flex-col gap-5">
              {/* 1. Task Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Task Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Audit Safety Plan"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all font-medium placeholder-gray-400"
                />
              </div>

              {/* 2 & 3. Project and WBS */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Project <span className="text-red-500">*</span></label>
                  <select
                    value={newTaskProject}
                    onChange={(e) => setNewTaskProject(e.target.value)}
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
                    value={newTaskWBS}
                    onChange={(e) => setNewTaskWBS(e.target.value)}
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
                    value={newTaskDeadlineDate}
                    onChange={(e) => setNewTaskDeadlineDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all font-medium text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Time <span className="text-gray-400 font-normal">(Opt)</span></label>
                  <input
                    type="time"
                    value={newTaskDeadlineTime}
                    onChange={(e) => setNewTaskDeadlineTime(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all font-medium text-gray-700"
                  />
                </div>
              </div>

              {/* 5. Status */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Status <span className="text-red-500">*</span></label>
                <select
                  value={newTaskStatus}
                  onChange={(e) => setNewTaskStatus(e.target.value as StatusType)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all font-medium text-gray-700 appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: `2.5rem` }}
                >
                  <option value="TODO">TODO</option>
                  <option value="IN PROGRESS">IN PROGRESS</option>
                  <option value="REVISION">REVISION</option>
                  <option value="DONE">DONE</option>
                </select>
              </div>

              {/* 6. Priority */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Priority <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {(["LOW", "MEDIUM", "HIGH", "URGENT"] as PriorityType[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setNewTaskPriority(p)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${newTaskPriority === p ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"}`}
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
                        if (newTaskAssignees.includes(name)) {
                          setNewTaskAssignees(newTaskAssignees.filter(a => a !== name));
                        } else {
                          setNewTaskAssignees([...newTaskAssignees, name]);
                        }
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer transition-all ${newTaskAssignees.includes(name)
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
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Enter task details..."
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
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim() || newTaskAssignees.length === 0}
                className="w-full bg-[#0062ff] text-white rounded-full py-4 font-bold text-[15px] hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <Check size={18} /> Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
