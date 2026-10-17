"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Project, PROJECT_STATUS_COLORS } from "./types";
import clsx from "clsx";

type Props = {
    projects: Project[];
    currentDate: Date;
    onNavigateMonth: (direction: -1 | 1) => void;
    onCreateProject: (dateStr: string) => void;
    onEditProject: (project: Project) => void;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ProjectsCalendarView({ projects, currentDate, onNavigateMonth, onCreateProject, onEditProject }: Props) {

    // GENERATE CALENDAR GRID
    const { grid, monthLabel } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startPadding = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        const totalCells = Math.ceil((startPadding + daysInMonth) / 7) * 7;

        const cells = [];
        for (let i = 0; i < totalCells; i++) {
            const dayNum = i - startPadding + 1;
            if (dayNum > 0 && dayNum <= daysInMonth) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                cells.push({ day: dayNum, dateStr, isCurrentMonth: true });
            } else {
                cells.push({ day: null, dateStr: null, isCurrentMonth: false });
            }
        }

        return {
            grid: cells,
            monthLabel: firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" })
        };
    }, [currentDate]);

    // RENDER PROJECT BAR
    const ProjectBar = ({ project }: { project: Project }) => {
        const statusColor = PROJECT_STATUS_COLORS[project.status] || "bg-neutral-100 text-neutral-600";
        const isPublished = project.status === "Published";

        // Extract border color from status color (approximate)
        // Actually, we can just use the status background for the whole pill

        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onEditProject(project);
                }}
                className={clsx(
                    "w-full text-left px-2 py-1 mb-1 rounded text-[10px] font-medium transition-all hover:brightness-95 flex items-center gap-1.5",
                    statusColor,
                    isPublished && "opacity-80"
                )}
            >
                <span className="truncate">{project.name}</span>
            </button>
        );
    }

    return (
        <div className="flex flex-col h-full">

            {/* HEADER */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">{monthLabel}</h2>
                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
                    <button
                        onClick={() => onNavigateMonth(-1)}
                        className="p-1.5 hover:bg-white rounded shadow-sm text-neutral-500 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-neutral-200 mx-1" />
                    <button
                        onClick={() => onNavigateMonth(1)}
                        className="p-1.5 hover:bg-white rounded shadow-sm text-neutral-500 transition-all"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* LEGEND */}
            <div className="flex items-center gap-4 mb-4 text-[10px] text-neutral-400">
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-neutral-50 border border-neutral-200" /> Backlog
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-orange-50 border border-orange-200" /> In Progress
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-50 border border-blue-200" /> Ready
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-green-50 border border-green-200" /> Published
                </div>
            </div>

            {/* CALENDAR BODY */}
            <div className="flex-1 flex flex-col border border-neutral-100 rounded-xl overflow-hidden shadow-sm bg-white min-h-[600px]">
                {/* DAYS HEADER */}
                <div className="grid grid-cols-7 border-b border-neutral-100 bg-neutral-50/50">
                    {DAYS.map(day => (
                        <div key={day} className="py-3 text-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>

                {/* GRID */}
                <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                    {grid.map((cell, idx) => {
                        const isToday = cell.day === new Date().getDate() && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

                        if (!cell.day) return <div key={idx} className="bg-neutral-50/30 border-b border-r border-neutral-50 min-h-[100px]" />;

                        const dayProjects = projects.filter(p => {
                            const date = p.scheduledDate || p.publishDate;
                            return date === cell.dateStr;
                        });

                        return (
                            <div
                                key={cell.dateStr}
                                className="group relative border-b border-r border-neutral-100 p-2 min-h-[100px] hover:bg-neutral-50/50 transition-colors cursor-pointer"
                                onClick={() => onCreateProject(cell.dateStr!)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={clsx(
                                        "text-xs font-semibold",
                                        isToday ? "text-white bg-neutral-900 w-6 h-6 flex items-center justify-center rounded-full" : "text-neutral-400"
                                    )}>
                                        {cell.day}
                                    </span>

                                    <button
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-200 text-neutral-400 transition-all"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCreateProject(cell.dateStr!);
                                        }}
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>

                                {/* PROJECTS */}
                                <div className="space-y-0.5 overflow-hidden max-h-[80px]">
                                    {dayProjects.slice(0, 4).map(project => <ProjectBar key={project.id} project={project} />)}
                                    {dayProjects.length > 4 && (
                                        <div className="text-[9px] text-neutral-400 text-center">+{dayProjects.length - 4} more</div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
