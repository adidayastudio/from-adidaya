"use client";

import { useState, useMemo } from "react";
import { Search, RotateCcw, Filter, ArrowUpDown, ChevronDown, Archive } from "lucide-react";
import clsx from "clsx";

const ARCHIVED_PROJECTS = [
    { id: "OAK", name: "Oakwood Residence", code: "005", date: "Dec 12, 2025", status: "Completed" },
    { id: "SVR", name: "Silver Lake Cabin", code: "008", date: "Nov 30, 2025", status: "Cancelled" },
    { id: "GEM", name: "Gemini Office Park", code: "002", date: "Oct 15, 2025", status: "Completed" },
    { id: "RVR", name: "Riverdale Heights", code: "010", date: "Sep 22, 2025", status: "Completed" },
    { id: "AST", name: "Astra Center", code: "009", date: "Aug 05, 2025", status: "Cancelled" },
];

export default function ArchivedPage() {
    const [query, setQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [showSearchInput, setShowSearchInput] = useState(false);

    const filtered = useMemo(() => {
        return ARCHIVED_PROJECTS.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(query.toLowerCase()) ||
                p.id.toLowerCase().includes(query.toLowerCase());
            const matchesStatus = filterStatus === "all" || p.status.toLowerCase() === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [query, filterStatus]);

    return (
        <div className="space-y-6 max-w-5xl animate-in fade-in duration-500">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-neutral-900">Archived Projects</h1>
                <p className="text-sm text-neutral-500">Past projects that are completed or inactive.</p>
            </div>

            <div className="border-b border-neutral-200" />

            {/* TOOLBAR */}
            <div className="flex items-center justify-between gap-2 w-full">
                {/* Search & Filter */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Search */}
                    <>
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
                                placeholder="Search archives..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-neutral-100 w-56 transition-all"
                            />
                        </div>
                    </>

                    {/* Filter Status */}
                    <div className="relative">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="appearance-none pl-9 pr-8 py-2 text-sm border border-neutral-200 rounded-full bg-white cursor-pointer hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-100"
                        >
                            <option value="all">All Status</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Mobile Search Expand */}
            {showSearchInput && (
                <div className="md:hidden relative w-full animate-in fade-in slide-in-from-top-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search archives..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-neutral-100"
                        autoFocus
                    />
                </div>
            )}

            <div className="space-y-3">
                {filtered.map((project) => (
                    <div key={project.id} className="group flex items-center justify-between p-4 bg-white hover:bg-neutral-50/80 border border-neutral-200 hover:border-neutral-300 rounded-xl transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                            {/* Icon */}
                            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400 group-hover:bg-white group-hover:text-neutral-500 transition-colors border border-neutral-200/50">
                                <Archive className="w-5 h-5" />
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h3 className="font-semibold text-neutral-900 group-hover:text-black transition-colors">{project.name}</h3>
                                    <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded border border-neutral-200 font-medium tracking-wide">
                                        {project.code} • {project.id}
                                    </span>
                                </div>
                                <p className="text-xs text-neutral-500">Archived on {project.date}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className={clsx(
                                "text-xs px-2.5 py-1 rounded-full font-medium border",
                                project.status === "Completed"
                                    ? "bg-green-50 text-green-700 border-green-100"
                                    : "bg-neutral-100 text-neutral-600 border-neutral-200"
                            )}>
                                {project.status}
                            </span>
                            <div className="w-px h-8 bg-neutral-200 mx-2 hidden sm:block" />
                            <button
                                className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Restore Project to Active"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="text-center py-12 text-neutral-400 text-sm bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
                        No archived projects found matching criteria.
                    </div>
                )}
            </div>
        </div>
    );
}
