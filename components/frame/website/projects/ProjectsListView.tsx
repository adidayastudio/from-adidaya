"use client";

import { useMemo, useState } from "react";
import { Project, PROJECT_STATUS_COLORS, ProjectStatus } from "./types";
import { MoreHorizontal, Globe, Calendar, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import { Button } from "@/shared/ui/primitives/button/button";

type Props = {
    projects: Project[];
    onEditProject: (project: Project) => void;
    onDeleteProject?: (project: Project) => void;
};

type SortKey = "name" | "year" | "category" | "status" | "author" | "date";
type SortDir = "asc" | "desc";

export default function ProjectsListView({ projects, onEditProject, onDeleteProject }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>("date");
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    const sortedProjects = useMemo(() => {
        return [...projects].sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case "name": cmp = a.name.localeCompare(b.name); break;
                case "year": cmp = (a.yearStart - b.yearStart); break;
                case "category": cmp = (a.categories[0] || "").localeCompare(b.categories[0] || ""); break;
                case "status": cmp = a.status.localeCompare(b.status); break;
                case "author": cmp = a.author.localeCompare(b.author); break;
                case "date":
                    const dateA = a.publishDate || a.scheduledDate || "";
                    const dateB = b.publishDate || b.scheduledDate || "";
                    cmp = dateA.localeCompare(dateB);
                    break;
            }
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [projects, sortKey, sortDir]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const SortIcon = ({ colKey }: { colKey: SortKey }) => {
        const isActive = sortKey === colKey;
        const iconClass = isActive ? "text-neutral-700" : "text-neutral-300";
        return (
            <span className={`ml-1 inline-flex ${iconClass}`}>
                {isActive && sortDir === "desc"
                    ? <ChevronDown className="w-3 h-3" />
                    : <ChevronUp className="w-3 h-3" />
                }
            </span>
        );
    };

    const SortableHeader = ({ label, colKey, className = "" }: { label: string; colKey: SortKey; className?: string }) => (
        <th
            className={`px-6 py-3 font-medium cursor-pointer hover:text-neutral-600 transition-colors select-none ${className}`}
            onClick={() => toggleSort(colKey)}
        >
            {label}
            <SortIcon colKey={colKey} />
        </th>
    );

    if (projects.length === 0) {
        return (
            <div className="p-10 text-center text-neutral-400 text-sm border border-neutral-200 rounded-xl bg-white">
                No projects found matching your criteria.
            </div>
        );
    }

    return (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                            <th className="px-6 py-3 w-[80px]">Image</th>
                            <SortableHeader label="Project Name" colKey="name" />
                            <SortableHeader label="Category" colKey="category" />
                            <SortableHeader label="Author" colKey="author" />
                            <SortableHeader label="Status" colKey="status" />
                            <SortableHeader label="Date" colKey="date" />
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {sortedProjects.map(project => (
                            <tr
                                key={project.id}
                                className="group hover:bg-neutral-50/50 transition-colors cursor-pointer"
                                onClick={() => onEditProject(project)}
                            >
                                <td className="px-6 py-3">
                                    <div className="w-12 h-9 rounded bg-neutral-100 overflow-hidden border border-neutral-100">
                                        <img src={project.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="font-bold text-sm text-neutral-900">{project.name}</div>
                                    <div className="text-xs text-neutral-500 mt-0.5">{project.yearStart}</div>
                                </td>
                                <td className="px-6 py-3">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                                        {project.categories?.[0] || "Uncategorized"}
                                    </span>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-600">
                                            {project.author.charAt(0)}
                                        </div>
                                        <span className="text-sm text-neutral-700">{project.author}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <span className={clsx(
                                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                                        PROJECT_STATUS_COLORS[project.status] || "bg-neutral-100 text-neutral-500"
                                    )}>
                                        {project.status.replace(/_/g, " ")}
                                    </span>
                                </td>
                                <td className="px-6 py-3">
                                    {(project.scheduledDate || project.publishDate) ? (
                                        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {project.publishDate || project.scheduledDate}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-neutral-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="Edit"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditProject(project);
                                            }}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Delete"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm("Are you sure you want to delete this project?")) {
                                                    onDeleteProject?.(project);
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
