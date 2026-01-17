"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CheckSquare, FolderKanban, Bell, Inbox, Calendar, AlertCircle, Flag, FileCheck } from "lucide-react";

type ViewMode = "tasks" | "projects" | "notifications";

// --- MOCK DATA: THIS WEEK (Proper Code Formats) ---
// Tasks: KO-XX-NN | Projects: 3-letter | Requests: REQ-NN | Approvals: APV-NN
const TASKS_WEEK = [
    { id: "KO-01-01", name: "Review JPF Design", day: "Tue", projectId: "JPF", projectName: "JPF House" },
    { id: "KO-02-03", name: "Submit Expense Report", day: "Wed", projectId: "UPC", projectName: "Urban Park" },
    { id: "KO-01-03", name: "Client Presentation", day: "Wed", projectId: "JPF", projectName: "JPF House" },
    { id: "KO-03-02", name: "Finalize Skyline Renderings", day: "Fri", projectId: "SKY", projectName: "Skyline Tower" },
    { id: "KO-02-04", name: "Weekly Report", day: "Fri", projectId: "UPC", projectName: "Urban Park" },
    { id: "KO-03-03", name: "Site Visit Prep", day: "Sat", projectId: "SKY", projectName: "Skyline Tower" },
];
const PROJECTS_WEEK = [
    { id: "JPF", name: "JPF House", milestone: "Phase 1 Delivery", dueDay: "Wed", progress: 65, color: "blue" },
    { id: "UPC", name: "Urban Park Concept", milestone: "Client Review", dueDay: "Fri", progress: 30, color: "emerald" },
    { id: "SKY", name: "Skyline Tower", milestone: "Final Submission", dueDay: "Sat", progress: 85, color: "violet" },
];
const NOTIFICATIONS_WEEK = [
    { id: "REQ-003", text: "Scheduled: Team standup meeting", user: "Calendar", type: "event", day: "Tue", link: "/dashboard/notifications" },
    { id: "REQ-004", text: "Deadline reminder: Skyline Tower", user: "System", type: "reminder", day: "Fri", link: "/flow/projects/SKY" },
    { id: "APV-002", text: "Requested document review", user: "Andi P.", type: "request", day: "Thu", link: "/dashboard/notifications" },
];

// (Week days calculated dynamically in component)

export function DashboardWeek() {
    const [mode, setMode] = useState<ViewMode>("tasks");

    // Dynamic week calculation
    const today = new Date();
    const currentDayIndex = today.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = currentDayIndex === 0 ? -6 : 1 - currentDayIndex;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const WEEK_DAYS_DATA = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        return { name, date: date.getDate(), isToday: date.toDateString() === today.toDateString(), isWeekend: i >= 5 };
    });

    const weekStart = monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekEnd = sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    // Group tasks by day
    const tasksByDay = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].reduce((acc, day) => {
        acc[day] = TASKS_WEEK.filter(t => t.day === day);
        return acc;
    }, {} as Record<string, typeof TASKS_WEEK>);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* HEADER */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-900">This Week</h2>
                <span className="text-xs text-neutral-500">{weekStart} – {weekEnd}</span>
            </div>

            {/* MINI CALENDAR (7 DAYS) */}
            <div className="grid grid-cols-7 gap-1">
                {WEEK_DAYS_DATA.map((day) => {
                    const tasksCount = tasksByDay[day.name]?.length || 0;
                    return (
                        <div key={day.name} className={clsx("p-1.5 rounded-lg border text-center transition-all", day.isToday ? "bg-blue-600 border-blue-600 text-white shadow-sm" : day.isWeekend ? "bg-neutral-50 border-neutral-100 text-neutral-400" : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300")}>
                            <span className={clsx("text-[8px] uppercase font-bold block", day.isToday ? "opacity-80" : "opacity-50")}>{day.name}</span>
                            <span className="text-xs font-bold">{day.date}</span>
                            {tasksCount > 0 && <div className={clsx("w-1 h-1 rounded-full mx-auto mt-0.5", day.isToday ? "bg-white/70" : "bg-blue-500")} />}
                        </div>
                    );
                })}
            </div>

            {/* COLORFUL TABS */}
            <div className="flex items-center gap-2">
                <TabButton active={mode === "tasks"} onClick={() => setMode("tasks")} icon={<CheckSquare className="w-4 h-4" />} label="Tasks" color="blue" count={TASKS_WEEK.length} />
                <TabButton active={mode === "projects"} onClick={() => setMode("projects")} icon={<FolderKanban className="w-4 h-4" />} label="Milestones" color="violet" count={PROJECTS_WEEK.length} />
                <TabButton active={mode === "notifications"} onClick={() => setMode("notifications")} icon={<Bell className="w-4 h-4" />} label="Upcoming" color="orange" count={NOTIFICATIONS_WEEK.length} />
            </div>

            {/* CONTENT */}
            <div className="space-y-3">

                {/* === TASKS VIEW (GROUPED BY DAY) === */}
                {mode === "tasks" && (
                    TASKS_WEEK.length > 0 ? (
                        <div className="space-y-3">
                            {WEEK_DAYS_DATA.map(dayData => {
                                const tasks = tasksByDay[dayData.name];
                                if (!tasks || tasks.length === 0) return null;
                                return (
                                    <div key={dayData.name} className="space-y-1.5">
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">{dayData.name}</p>
                                        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden divide-y divide-neutral-100">
                                            {tasks.map(task => (
                                                <Link key={task.id} href={`/flow/projects/${task.projectId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-all group border-b border-neutral-50 last:border-b-0">
                                                    <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-500 flex flex-col items-center justify-center shrink-0 border border-neutral-200">
                                                        <span className="text-[8px] font-bold uppercase">{task.day}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-xs font-semibold text-neutral-700 group-hover:text-neutral-900 block truncate transition-colors">{task.name}</span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                            <span className="text-[10px] text-neutral-400 font-medium">{task.projectName}</span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <EmptyState text="No tasks this week" />
                )}

                {/* === PROJECTS VIEW (MILESTONES) === */}
                {mode === "projects" && (
                    PROJECTS_WEEK.length > 0 ? (
                        <div className="grid gap-3">
                            {PROJECTS_WEEK.map(project => (
                                <Link key={project.id} href={`/flow/projects/${project.id}`} className="block p-4 rounded-2xl border border-neutral-100 bg-white shadow-sm hover:border-neutral-200 hover:shadow-md transition-all group">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-neutral-400">{project.id}</span>
                                                <span className="text-sm font-semibold text-neutral-900 group-hover:text-violet-600">{project.name}</span>
                                            </div>
                                            <span className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5"><Flag className="w-3 h-3" /> {project.milestone}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">{project.dueDay}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                                            <div className={clsx("h-full rounded-full transition-all", `bg-${project.color}-500`)} style={{ width: `${project.progress}%` }} />
                                        </div>
                                        <span className="text-[10px] font-medium text-neutral-500">{project.progress}%</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : <EmptyState text="No milestones this week" />
                )}

                {/* === NOTIFICATIONS VIEW === */}
                {mode === "notifications" && (
                    NOTIFICATIONS_WEEK.length > 0 ? (
                        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden divide-y divide-neutral-100">
                            {NOTIFICATIONS_WEEK.map(notif => (
                                <Link key={notif.id} href={notif.link} className="flex items-start gap-4 p-4 hover:bg-neutral-50 transition-all group border-b border-neutral-50 last:border-b-0">
                                    <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
                                        notif.type === "event" ? "bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600" :
                                            notif.type === "reminder" ? "bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600" :
                                                "bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600"
                                    )}>
                                        {notif.type === "event" && <Calendar className="w-5 h-5" />}
                                        {notif.type === "reminder" && <AlertCircle className="w-5 h-5" />}
                                        {notif.type === "request" && <FileCheck className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <p className="text-xs font-bold text-neutral-900">{notif.user}</p>
                                            <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-md">{notif.day}</span>
                                        </div>
                                        <p className="text-xs text-neutral-600 leading-relaxed group-hover:text-neutral-800 transition-colors">
                                            {notif.text}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : <EmptyState text="No upcoming events" />
                )}

            </div>
        </div>
    );
}

// --- HELPER COMPONENTS ---

function TabButton({ active, onClick, icon, label, color, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; color: string; count?: number }) {
    const colorClasses: Record<string, string> = {
        blue: "bg-blue-100 text-blue-700 border-blue-200",
        violet: "bg-violet-100 text-violet-700 border-violet-200",
        orange: "bg-orange-100 text-orange-700 border-orange-200",
    };
    return (
        <button
            onClick={onClick}
            className={clsx(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-all",
                active ? colorClasses[color] : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"
            )}
        >
            {icon} {label}
            {count !== undefined && count > 0 && (
                <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1", active ? "bg-white/60" : "bg-neutral-100")}>{count}</span>
            )}
        </button>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 h-40 text-neutral-400 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/30">
            <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-neutral-100 flex items-center justify-center">
                <Inbox className="w-5 h-5 opacity-50" />
            </div>
            <span className="text-xs font-medium">{text}</span>
        </div>
    );
}
