"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Filter, ChevronDown, Search, Inbox, ArrowRight, X, ArrowUpDown } from "lucide-react";
import type { MyTasksSection } from "./MyTasksSidebar";

// ==========================================================================
// MOCK DATA (Proper Code Formats)
// ==========================================================================

const ALL_TASKS = [
  { id: "KO-01-01", name: "Review JPF Design", projectId: "JPF", projectName: "JPF House", dueDate: "2026-01-06", status: "in-progress", priority: "high" },
  { id: "KO-01-02", name: "Client Meeting Prep", projectId: "JPF", projectName: "JPF House", dueDate: "2026-01-06", status: "not-started", priority: "medium" },
  { id: "KO-02-01", name: "Update Weekly Report", projectId: "UPC", projectName: "Urban Park", dueDate: "2026-01-06", status: "in-progress", priority: "low" },
  { id: "KO-03-01", name: "Finalize Material List", projectId: "SKY", projectName: "Skyline Tower", dueDate: "2026-01-07", status: "not-started", priority: "high" },
  { id: "KO-02-02", name: "Submit Expense Report", projectId: "UPC", projectName: "Urban Park", dueDate: "2026-01-04", status: "not-started", priority: "urgent" },
  { id: "KO-03-02", name: "Site Visit Prep", projectId: "SKY", projectName: "Skyline Tower", dueDate: "2026-01-10", status: "not-started", priority: "medium" },
  { id: "KO-01-03", name: "Design Review Complete", projectId: "JPF", projectName: "JPF House", dueDate: "2026-01-03", status: "completed", priority: "high" },
  { id: "KO-02-03", name: "Budget Analysis", projectId: "UPC", projectName: "Urban Park", dueDate: "2026-01-02", status: "completed", priority: "medium" },
  // Dummies for Scroll Testing
  { id: "KO-04-01", name: "Coordinate with Structural Engineer", projectId: "BWR", projectName: "Blue Water Resort", dueDate: "2026-01-08", status: "in-progress", priority: "high" },
  { id: "KO-04-02", name: "Draft Initial Sketches", projectId: "BWR", projectName: "Blue Water Resort", dueDate: "2026-01-09", status: "not-started", priority: "medium" },
  { id: "KO-05-01", name: "Permit Application", projectId: "CTY", projectName: "City Center", dueDate: "2026-01-12", status: "not-started", priority: "urgent" },
  { id: "KO-05-02", name: "Landscape Revision", projectId: "CTY", projectName: "City Center", dueDate: "2026-01-12", status: "in-progress", priority: "low" },
  { id: "KO-06-01", name: "Interior Material Selection", projectId: "LAK", projectName: "Lakeside Villa", dueDate: "2026-01-15", status: "not-started", priority: "medium" },
  { id: "KO-06-02", name: "Lighting Plan Review", projectId: "LAK", projectName: "Lakeside Villa", dueDate: "2026-01-16", status: "in-progress", priority: "high" },
  { id: "KO-07-01", name: "Update Schedule", projectId: "MNT", projectName: "Mountain Retreat", dueDate: "2026-01-18", status: "not-started", priority: "low" },
  { id: "KO-07-02", name: "Vendor Coordination", projectId: "MNT", projectName: "Mountain Retreat", dueDate: "2026-01-20", status: "in-progress", priority: "medium" },
  { id: "KO-08-01", name: "Prepare Presentation", projectId: "RVR", projectName: "River Side Condo", dueDate: "2026-01-22", status: "not-started", priority: "high" },
  { id: "KO-08-02", name: "Client Feedback Integration", projectId: "RVR", projectName: "River Side Condo", dueDate: "2026-01-25", status: "not-started", priority: "urgent" },
  { id: "KO-09-01", name: "Final Inspection", projectId: "VAL", projectName: "Valley Office", dueDate: "2026-01-28", status: "not-started", priority: "medium" },
  { id: "KO-09-02", name: "Handover Documentation", projectId: "VAL", projectName: "Valley Office", dueDate: "2026-01-30", status: "not-started", priority: "low" },
  { id: "KO-10-01", name: "Post-Occupancy Evaluation", projectId: "GRD", projectName: "Garden Estates", dueDate: "2026-02-01", status: "not-started", priority: "low" },
  { id: "KO-10-02", name: "Archive Project Files", projectId: "GRD", projectName: "Garden Estates", dueDate: "2026-02-05", status: "not-started", priority: "low" }
];

// ==========================================================================
// SECTION CONFIG
// ==========================================================================

const SECTION_CONFIG: Record<MyTasksSection, { title: string; subtitle: string; emptyText: string }> = {
  "today": { title: "Today", subtitle: "Tasks due today", emptyText: "No tasks due today 🎉" },
  "this-week": { title: "This Week", subtitle: "Tasks due this week", emptyText: "No tasks due this week" },
  "overdue": { title: "Overdue", subtitle: "Tasks past their due date", emptyText: "No overdue tasks. Great job!" },
  "all-tasks": { title: "All Tasks", subtitle: "All your active tasks", emptyText: "No active tasks" },
  "completed": { title: "Completed", subtitle: "Tasks you've finished", emptyText: "No completed tasks yet" },
};

// ==========================================================================
// MAIN COMPONENT
// ==========================================================================

interface MyTasksContentProps {
  section: MyTasksSection;
}

export default function MyTasksContent({ section }: MyTasksContentProps) {
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const config = SECTION_CONFIG[section];

  // Filter tasks based on section scope
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  let filteredTasks = ALL_TASKS.filter(task => {
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    switch (section) {
      case "today":
        return task.status !== "completed" && dueDate.getTime() === today.getTime();
      case "this-week":
        return task.status !== "completed" && dueDate >= startOfWeek && dueDate <= endOfWeek;
      case "overdue":
        return task.status !== "completed" && dueDate < today;
      case "all-tasks":
        return task.status !== "completed";
      case "completed":
        return task.status === "completed";
      default:
        return true;
    }
  });

  // Apply filters
  if (filterProject !== "all") {
    filteredTasks = filteredTasks.filter(t => t.projectId === filterProject);
  }
  if (filterStatus !== "all") {
    filteredTasks = filteredTasks.filter(t => t.status === filterStatus);
  }
  if (filterPriority !== "all") {
    filteredTasks = filteredTasks.filter(t => t.priority === filterPriority);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredTasks = filteredTasks.filter(t => t.name.toLowerCase().includes(q) || t.projectName.toLowerCase().includes(q));
  }

  // Apply sort
  filteredTasks = filteredTasks.sort((a, b) => {
    const dateA = new Date(a.dueDate).getTime();
    const dateB = new Date(b.dueDate).getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  // Get unique projects for filter
  const projects = Array.from(new Set(ALL_TASKS.map(t => t.projectId))).map(id => ({
    id,
    name: ALL_TASKS.find(t => t.projectId === id)?.projectName || id,
  }));

  return (
    <div className="space-y-5 animate-in fade-in duration-500">

      {/* === PAGE HEADER === */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-neutral-900">{config.title}</h1>
        <p className="text-sm text-neutral-500">{config.subtitle} · <span className="font-medium text-neutral-700">{filteredTasks.length} tasks</span></p>
      </div>

      <div className="border-b border-neutral-200" />

      {/* === TOOLBAR (Responsive - matches Feel Clock) === */}
      <div className="flex items-center justify-between gap-2 w-full">
        {/* LEFT GROUP: Search + Filters */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Search: Icon on mobile, Input on md+ */}
          <button
            onClick={() => setShowSearchInput(!showSearchInput)}
            className="md:hidden p-2 rounded-full border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 transition-colors flex-shrink-0"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>
          <div className="relative hidden md:block flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:border-neutral-400 w-36"
            />
          </div>

          {/* Project Filter: Dropdown on md+ */}
          <div className="relative hidden md:block flex-shrink-0">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-neutral-200 rounded-full bg-white cursor-pointer hover:border-neutral-300 focus:outline-none"
            >
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
          </div>

          {/* Status Filter: Dropdown on md+ */}
          <div className="relative hidden md:block flex-shrink-0">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-neutral-200 rounded-full bg-white cursor-pointer hover:border-neutral-300 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
          </div>

          {/* Priority Filter: Dropdown on md+ */}
          <div className="relative hidden md:block flex-shrink-0">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-neutral-200 rounded-full bg-white cursor-pointer hover:border-neutral-300 focus:outline-none"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
          </div>

          {/* Filter Icon: Mobile only - shows dropdown sheet */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={clsx(
              "md:hidden p-2 rounded-full border border-neutral-200 bg-white transition-colors flex-shrink-0",
              showMobileFilters ? "text-neutral-700 bg-neutral-100" : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
            )}
            title="Filter"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* RIGHT GROUP: Clear + Sort */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {(filterProject !== "all" || filterStatus !== "all" || filterPriority !== "all" || searchQuery) && (
            <button
              onClick={() => { setFilterProject("all"); setFilterStatus("all"); setFilterPriority("all"); setSearchQuery(""); setShowSearchInput(false); setShowMobileFilters(false); }}
              className="p-2 rounded-full border border-neutral-200 bg-white text-neutral-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
              title="Clear filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            className={clsx(
              "p-2 rounded-full border bg-white transition-colors",
              sortOrder === "asc" ? "border-blue-200 text-blue-600 bg-blue-50" : "border-neutral-200 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
            )}
            title={sortOrder === "desc" ? "Sort: Newest First" : "Sort: Oldest First"}
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Search Input for mobile */}
      {showSearchInput && (
        <div className="md:hidden relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:border-neutral-400 w-full"
            autoFocus
          />
        </div>
      )}

      {/* Mobile Filter Sheet */}
      {showMobileFilters && (
        <div className="md:hidden bg-white border border-neutral-200 rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-700">Filters</span>
            <button onClick={() => setShowMobileFilters(false)} className="text-neutral-400 hover:text-neutral-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Project */}
          <div className="relative">
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Project</label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="appearance-none w-full pl-3 pr-8 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:border-neutral-400"
            >
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 bottom-3 w-4 h-4 text-neutral-400 pointer-events-none" />
          </div>
          {/* Status */}
          <div className="relative">
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none w-full pl-3 pr-8 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:border-neutral-400"
            >
              <option value="all">All Status</option>
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
            </select>
            <ChevronDown className="absolute right-3 bottom-3 w-4 h-4 text-neutral-400 pointer-events-none" />
          </div>
          {/* Priority */}
          <div className="relative">
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="appearance-none w-full pl-3 pr-8 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:border-neutral-400"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <ChevronDown className="absolute right-3 bottom-3 w-4 h-4 text-neutral-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* === TASK LIST === */}
      {filteredTasks.length > 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden divide-y divide-neutral-100">
          {filteredTasks.map(task => (
            <Link
              key={task.id}
              href={`/flow/projects/${task.projectId}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-800 group-hover:text-neutral-900 truncate">{task.name}</span>
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    <span className="font-medium text-neutral-500">{task.id}</span> · {task.projectName}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={clsx("text-xs font-medium",
                  new Date(task.dueDate) < today && task.status !== "completed" ? "text-red-600" : "text-neutral-500"
                )}>
                  {formatDueDate(task.dueDate)}
                </span>
                <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 h-40 text-sm text-neutral-400 italic rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50">
          <Inbox className="w-5 h-5" /> {config.emptyText}
        </div>
      )}

    </div>
  );
}

// ==========================================================================
// HELPER COMPONENTS
// ==========================================================================

function FilterDropdown({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 py-2 text-xs font-medium border border-neutral-200 rounded-full bg-white cursor-pointer hover:border-neutral-300 focus:outline-none focus:border-neutral-400"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "not-started": "bg-neutral-100 text-neutral-600",
    "in-progress": "bg-blue-100 text-blue-700",
    "completed": "bg-emerald-100 text-emerald-700",
  };
  const labels: Record<string, string> = {
    "not-started": "Not Started",
    "in-progress": "In Progress",
    "completed": "Completed",
  };
  return (
    <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-full", styles[status] || styles["not-started"])}>
      {labels[status] || status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  // Don't show badge for Low priority
  if (priority === "low") return null;

  const styles: Record<string, string> = {
    "urgent": "bg-red-100 text-red-700",
    "high": "bg-orange-100 text-orange-700",
    "medium": "bg-blue-100 text-blue-700",
  };
  const labels: Record<string, string> = {
    "urgent": "Urgent",
    "high": "High",
    "medium": "Medium",
  };
  return (
    <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-full", styles[priority] || "bg-neutral-100 text-neutral-600")}>
      {labels[priority] || priority}
    </span>
  );
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === tomorrow.getTime()) return "Tomorrow";
  if (date < today) {
    const days = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return `${days}d overdue`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
