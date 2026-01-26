"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Filter, ChevronDown, Search, Inbox, ArrowRight, X, ArrowUpDown, FolderKanban, AlertCircle, CheckCircle2, Archive, Activity } from "lucide-react";
import { SummaryFilterCards, FilterItem } from "@/components/dashboard/shared/SummaryFilterCards";

export type MyProjectsSection = "all-projects" | "active" | "attention" | "updates" | "archived" | "completed";

// ==========================================================================
// MOCK DATA
// ==========================================================================

const ALL_PROJECTS = [
    { id: "JPF", code: "JPF", name: "JPF House", status: "active", progress: 68, attention: false, hasUpdates: true, lastUpdate: "2h ago", deadline: "2026-03-15" },
    { id: "UPC", code: "UPC", name: "Urban Park Center", status: "active", progress: 45, attention: true, hasUpdates: false, lastUpdate: "1d ago", deadline: "2026-04-20" },
    { id: "SKY", code: "SKY", name: "Skyline Tower", status: "attention", progress: 12, attention: true, hasUpdates: true, lastUpdate: "30m ago", deadline: "2026-02-28" },
    { id: "GRD", code: "GRD", name: "Garden Estates", status: "active", progress: 89, attention: false, hasUpdates: false, lastUpdate: "3d ago", deadline: "2026-01-30" },
    { id: "LAK", code: "LAK", name: "Lakeside Villa", status: "active", progress: 34, attention: false, hasUpdates: true, lastUpdate: "5h ago", deadline: "2026-05-10" },
    { id: "MNT", code: "MNT", name: "Mountain Retreat", status: "active", progress: 56, attention: false, hasUpdates: false, lastUpdate: "2d ago", deadline: "2026-03-01" },
    { id: "RVR", code: "RVR", name: "River Side Condo", status: "completed", progress: 100, attention: false, hasUpdates: false, lastUpdate: "1w ago", deadline: "2025-12-20" },
    { id: "VAL", code: "VAL", name: "Valley Office", status: "archived", progress: 100, attention: false, hasUpdates: false, lastUpdate: "2w ago", deadline: "2025-11-15" },
    { id: "CTY", code: "CTY", name: "City Center", status: "attention", progress: 5, attention: true, hasUpdates: false, lastUpdate: "4h ago", deadline: "2026-06-01" },
    { id: "BWR", code: "BWR", name: "Blue Water Resort", status: "active", progress: 22, attention: false, hasUpdates: true, lastUpdate: "1h ago", deadline: "2026-08-15" },
];

export default function MyProjectsContent({ section }: { section: MyProjectsSection }) {
    const router = useRouter();
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearchInput, setShowSearchInput] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // Counts
    const counts = {
        all: ALL_PROJECTS.filter(p => p.status !== "archived" && p.status !== "completed").length,
        active: ALL_PROJECTS.filter(p => p.status === "active").length,
        attention: ALL_PROJECTS.filter(p => p.attention || p.status === "attention").length,
        updates: ALL_PROJECTS.filter(p => p.hasUpdates).length,
        completed: ALL_PROJECTS.filter(p => p.status === "completed").length,
        archived: ALL_PROJECTS.filter(p => p.status === "archived").length,
    };

    const filterItems: FilterItem[] = [
        { id: "all-projects", label: "All Active", count: counts.all, color: "neutral" },
        { id: "active", label: "Active", count: counts.active, color: "blue" },
        { id: "attention", label: "Need Attention", count: counts.attention, color: "red" },
        { id: "updates", label: "Updates", count: counts.updates, color: "purple" },
        { id: "completed", label: "Completed", count: counts.completed, color: "green" },
        { id: "archived", label: "Archived", count: counts.archived, color: "neutral" },
    ];

    // Filtering
    let filteredProjects = ALL_PROJECTS.filter(project => {
        switch (section) {
            case "active":
                return project.status === "active";
            case "attention":
                return project.attention || project.status === "attention";
            case "updates":
                return project.hasUpdates;
            case "completed":
                return project.status === "completed";
            case "archived":
                return project.status === "archived";
            case "all-projects":
                return project.status !== "archived" && project.status !== "completed";
            default:
                return true;
        }
    });

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filteredProjects = filteredProjects.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* HEADER & CARDS - Hidden on Mobile */}
            <div className="hidden md:block space-y-4">
                <h1 className="text-2xl font-bold text-neutral-900">My Projects</h1>
                <SummaryFilterCards
                    items={filterItems}
                    selectedId={section}
                    onSelect={(id) => router.push(`/dashboard/projects?section=${id}`)}
                />
            </div>

            <div className="h-px bg-neutral-100" />

            {/* TOOLBAR - Desktop Only */}
            <div className="hidden md:flex items-center justify-between gap-2">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:border-neutral-400 w-full"
                    />
                </div>
            </div>

            {/* LIST */}
            {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProjects.map(project => (
                        <Link
                            key={project.id}
                            href={`/flow/projects/${project.id}`}
                            className="group flex flex-col justify-between p-5 rounded-3xl bg-white border border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                                            {project.code}
                                        </span>
                                        <div>
                                            <h3 className="font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors leading-tight">
                                                {project.name}
                                            </h3>
                                            <p className="text-xs text-neutral-500 mt-0.5">Deadline: {new Date(project.deadline).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    {project.attention && (
                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-medium text-neutral-500">
                                        <span>Progress</span>
                                        <span>{project.progress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                                        <div
                                            className={clsx("h-full rounded-full transition-all duration-500",
                                                project.progress === 100 ? "bg-green-500" :
                                                    project.attention ? "bg-red-500" : "bg-blue-600"
                                            )}
                                            style={{ width: `${project.progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-neutral-200 border border-white" />
                                    <div className="w-6 h-6 rounded-full bg-neutral-300 border border-white" />
                                    <div className="w-6 h-6 rounded-full bg-neutral-400 border border-white flex items-center justify-center text-[8px] text-white font-bold">+2</div>
                                </div>
                                {project.hasUpdates && (
                                    <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Activity className="w-3 h-3" /> Update
                                    </span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 text-neutral-400 text-center">
                    <FolderKanban className="w-12 h-12 mb-3 text-neutral-300" />
                    <p>No projects found in this view.</p>
                </div>
            )}

        </div>
    );
}
