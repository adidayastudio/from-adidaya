
"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  MoreHorizontal,
  Search,
  Filter,
  List,
  Grid3X3,
  ChevronDown
} from "lucide-react";

type ProjectStatus = "Delayed" | "On Track" | "Ahead" | "Critical";

interface Project {
  id: string;
  projectNo: string;
  code: string;
  name: string;
  status: ProjectStatus;
  progress: number;
  client: string;
  lastUpdate: string;
}

const PROJECTS: Project[] = [
  { id: "JPF", projectNo: "001", code: "JPF", name: "JPF House", status: "Critical" as ProjectStatus, progress: 45, client: "Jean Pierre", lastUpdate: "2h ago" },
  { id: "SKY", projectNo: "002", code: "SKY", name: "Skyline Tower", status: "Delayed" as ProjectStatus, progress: 30, client: "Skyline Grp", lastUpdate: "1d ago" },
  { id: "UPC", projectNo: "003", code: "UPC", name: "Urban Park Center", status: "On Track" as ProjectStatus, progress: 62, client: "City Govt", lastUpdate: "3d ago" },
  { id: "LAK", projectNo: "004", code: "LAK", name: "Lakeside Villa", status: "On Track" as ProjectStatus, progress: 15, client: "Sarah Lake", lastUpdate: "5h ago" },
  { id: "RVR", projectNo: "005", code: "RVR", name: "River Side Condo", status: "Ahead" as ProjectStatus, progress: 85, client: "River Est", lastUpdate: "Just now" },
  { id: "MNT", projectNo: "006", code: "MNT", name: "Mountain Retreat", status: "On Track" as ProjectStatus, progress: 5, client: "Mr. Everest", lastUpdate: "1w ago" },
];

export default function ActiveProjectsPage() {
  const [view, setView] = useState<"list" | "board">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Filter & Sort
  const filteredProjects = PROJECTS.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;

    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const priority = { "Critical": 0, "Delayed": 1, "On Track": 2, "Ahead": 3 };
    return priority[a.status] - priority[b.status];
  });

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "Critical": return "bg-red-50 text-red-700 border-red-100";
      case "Delayed": return "bg-orange-50 text-orange-700 border-orange-100";
      case "On Track": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Ahead": return "bg-blue-50 text-blue-700 border-blue-100";
      default: return "bg-neutral-50 text-neutral-600 border-neutral-100";
    }
  };

  const progressBarColor = (progress: number) => {
    if (progress <= 20) return "bg-red-500";
    if (progress <= 40) return "bg-orange-500";
    if (progress <= 60) return "bg-yellow-500";
    if (progress <= 80) return "bg-blue-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-neutral-900">Active Projects</h1>
        <p className="text-sm text-neutral-500">Currently running projects sorted by urgency.</p>
      </div>

      <div className="border-b border-neutral-200" />

      {/* TOOLBAR - MATCHING CLOCK STYLE */}
      <div className="flex items-center justify-between gap-2 w-full">
        {/* LEFT GROUP: Search & Filter */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Search: Icon on tiny, Input on md+ */}
          <>
            {/* Icon-only button for tiny screens */}
            <button
              onClick={() => setShowSearchInput(!showSearchInput)}
              className="md:hidden p-2 rounded-full border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 transition-colors flex-shrink-0"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            {/* Full input for md+ */}
            <div className="relative hidden md:block flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-neutral-100 w-48 transition-all"
              />
            </div>
          </>

          {/* Filter Dropdown (Styled like Clock Month Picker) */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 text-sm border border-neutral-200 rounded-full bg-white cursor-pointer hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-100"
            >
              <option value="all">All Status</option>
              <option value="Critical">Critical</option>
              <option value="Delayed">Delayed</option>
              <option value="On Track">On Track</option>
              <option value="Ahead">Ahead</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        {/* RIGHT GROUP: View Toggle */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex items-center bg-neutral-100 rounded-full p-1">
            <button
              onClick={() => setView("list")}
              className={clsx("p-2 rounded-full transition-colors", view === "list" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("board")}
              className={clsx("p-2 rounded-full transition-colors", view === "board" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}
              title="Board View"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Search Input for tiny screens */}
      {showSearchInput && (
        <div className="md:hidden relative w-full animate-in fade-in slide-in-from-top-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-neutral-100"
            autoFocus
          />
        </div>
      )}

      {/* VIEW CONTENT */}
      {view === "list" ? (
        // LIST VIEW
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <div key={project.id} className="group flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-xl shadow-sm hover:border-neutral-300 transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                {/* Project Code Badge (Style from Flow/Projects) */}
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-neutral-50 border border-neutral-100 text-neutral-500">
                  <span className="text-[10px] font-medium leading-none">{project.projectNo}</span>
                  <span className="text-xs font-bold leading-none mt-0.5">{project.code}</span>
                </div>
                <div>
                  <div className="font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors">{project.name}</div>
                  <div className="text-xs text-neutral-500">{project.client}</div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                {/* Progress Bar */}
                <div className="hidden md:block w-32 space-y-1">
                  <div className="flex justify-between text-[10px] font-medium text-neutral-500">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${progressBarColor(project.progress)}`} style={{ width: `${project.progress}%` }} />
                  </div>
                </div>

                {/* Status Badge */}
                <div className={clsx(
                  "text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border",
                  getStatusColor(project.status)
                )}>
                  {project.status}
                </div>

                <button className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-50">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          {filteredProjects.length === 0 && (
            <div className="text-center py-10 text-neutral-400 text-sm">No projects found.</div>
          )}
        </div>
      ) : (
        // BOARD VIEW
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div key={project.id} className="group p-4 bg-white border border-neutral-200 rounded-xl shadow-sm hover:border-neutral-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-full">

              {/* Header */}
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium bg-neutral-50 px-2 py-1 rounded-md border border-neutral-100">
                    <span>{project.projectNo}</span>
                    <span className="text-neutral-300">•</span>
                    <span>{project.code}</span>
                  </div>
                  <button className="text-neutral-400 hover:text-neutral-600"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
                <h3 className="font-semibold text-neutral-900 text-lg group-hover:text-blue-600 transition-colors">{project.name}</h3>
                <p className="text-sm text-neutral-500 mt-1">{project.client}</p>
              </div>

              {/* Progress & Footer */}
              <div>
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-[10px] uppercase tracking-wide font-medium text-neutral-500">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${progressBarColor(project.progress)}`} style={{ width: `${project.progress}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                  <span className={clsx("text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border", getStatusColor(project.status))}>
                    {project.status}
                  </span>
                  <span className="text-xs text-neutral-400">{project.lastUpdate}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredProjects.length === 0 && (
            <div className="col-span-full text-center py-10 text-neutral-400 text-sm">No projects found.</div>
          )}
        </div>
      )}

    </div>
  );
}

