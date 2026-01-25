"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Filter, ChevronDown, Search, Inbox, ArrowRight, X, ArrowUpDown } from "lucide-react";
import { SummaryFilterCards, FilterItem } from "@/components/dashboard/shared/SummaryFilterCards";

export type MyTasksSection = "today" | "this-week" | "overdue" | "all-tasks" | "completed";

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
// MAIN COMPONENT
// ==========================================================================

export default function MyTasksContent({ section }: { section: MyTasksSection }) {
  const router = useRouter();
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Date Logic
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Counts Calculation
  const counts = {
    today: ALL_TASKS.filter(t => t.status !== "completed" && new Date(t.dueDate).setHours(0, 0, 0, 0) === today.getTime()).length,
    week: ALL_TASKS.filter(t => t.status !== "completed" && new Date(t.dueDate) >= startOfWeek && new Date(t.dueDate) <= endOfWeek).length,
    overdue: ALL_TASKS.filter(t => t.status !== "completed" && new Date(t.dueDate) < today).length,
    all: ALL_TASKS.filter(t => t.status !== "completed").length,
    completed: ALL_TASKS.filter(t => t.status === "completed").length
  };

  const filterItems: FilterItem[] = [
    { id: "all-tasks", label: "Total Tasks", count: counts.all, color: "neutral" },
    { id: "today", label: "Today", count: counts.today, color: "blue" },
    { id: "this-week", label: "This Week", count: counts.week, color: "neutral" },
    { id: "overdue", label: "Overdue", count: counts.overdue, color: "red" },
    { id: "completed", label: "Completed", count: counts.completed, color: "green" },
  ];

  // Logic to filter the MAIN LIST based on the selected section (from URL/Props)
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
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* HEADER & SUMMARY CARDS */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-neutral-900">My Tasks</h1>

        <SummaryFilterCards
          items={filterItems}
          selectedId={section}
          onSelect={(id) => router.push(`/dashboard/tasks?section=${id}`)}
        />
      </div>

      <div className="h-px bg-neutral-100" />

      {/* TOOLBAR */}
      <div className="flex items-center justify-between gap-2 w-full">
        {/* LEFT GROUP: Search + Filters */}
        <div className="flex items-center gap-2 flex-shrink-0">
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

      {showMobileFilters && (
        <div className="md:hidden bg-white border border-neutral-200 rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-700">Filters</span>
            <button onClick={() => setShowMobileFilters(false)} className="text-neutral-400 hover:text-neutral-600">
              <X className="w-4 h-4" />
            </button>
          </div>
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
          <Inbox className="w-5 h-5" /> No tasks found in this section
        </div>
      )}

    </div>
  );
}

// ==========================================================================
// HELPER COMPONENTS
// ==========================================================================

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
