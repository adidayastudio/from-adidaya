"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CheckSquare, FolderKanban, Bell, Inbox, AlertTriangle, Clock, FileCheck, AlertCircle } from "lucide-react";

type ViewMode = "tasks" | "projects" | "notifications";

// --- MOCK DATA: OVERDUE (Proper Code Formats) ---
// Tasks: KO-XX-NN | Projects: 3-letter | Requests: REQ-NN | Approvals: APV-NN
const TASKS_OVERDUE = [
    { id: "KO-02-05", name: "Submit Expense Report", daysOverdue: 1, projectId: "UPC", projectName: "Urban Park" },
    { id: "KO-03-04", name: "Finalize Renderings", daysOverdue: 3, projectId: "SKY", projectName: "Skyline Tower" },
    { id: "KO-01-04", name: "Client Feedback Review", daysOverdue: 5, projectId: "JPF", projectName: "JPF House" },
    { id: "KO-01-05", name: "Update Documentation", daysOverdue: 2, projectId: "JPF", projectName: "JPF House" },
];
const PROJECTS_OVERDUE = [
    { id: "SKY", name: "Skyline Tower", issue: "Missed Phase 2 deadline", daysOverdue: 3, tasksOverdue: 2, color: "red" },
];
const NOTIFICATIONS_OVERDUE = [
    { id: "APV-003", text: "Leave request pending approval", user: "Andi Pratama", daysOverdue: 2, type: "approval", link: "/dashboard/notifications" },
    { id: "APV-004", text: "Budget approval awaiting response", user: "Finance Team", daysOverdue: 4, type: "approval", link: "/dashboard/notifications" },
    { id: "REQ-005", text: "Document signature required", user: "Legal", daysOverdue: 1, type: "signature", link: "/dashboard/notifications" },
];

export function DashboardOverdue() {
    const [mode, setMode] = useState<ViewMode>("tasks");
    const totalOverdue = TASKS_OVERDUE.length + PROJECTS_OVERDUE.length + NOTIFICATIONS_OVERDUE.length;

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* WARNING BANNER */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                    <p className="text-sm font-bold text-red-800">Action Required</p>
                    <p className="text-xs text-red-600/80">{totalOverdue} items have passed their deadline</p>
                </div>
            </div>

            {/* COLORFUL TABS */}
            <div className="flex items-center gap-2">
                <TabButton active={mode === "tasks"} onClick={() => setMode("tasks")} icon={<CheckSquare className="w-4 h-4" />} label="Tasks" color="red" count={TASKS_OVERDUE.length} />
                <TabButton active={mode === "projects"} onClick={() => setMode("projects")} icon={<FolderKanban className="w-4 h-4" />} label="Projects" color="orange" count={PROJECTS_OVERDUE.length} />
                <TabButton active={mode === "notifications"} onClick={() => setMode("notifications")} icon={<Bell className="w-4 h-4" />} label="Pending" color="amber" count={NOTIFICATIONS_OVERDUE.length} />
            </div>

            {/* CONTENT */}
            <div className="space-y-3">

                {/* === TASKS VIEW === */}
                {mode === "tasks" && (
                    TASKS_OVERDUE.length > 0 ? (
                        <div className="rounded-2xl border border-red-100 bg-white shadow-sm overflow-hidden divide-y divide-red-50">
                            {TASKS_OVERDUE.map(task => (
                                <Link key={task.id} href={`/flow/projects/${task.projectId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-red-50/30 transition-all group border-b border-red-50 last:border-b-0">
                                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200 font-bold text-xs ring-4 ring-red-50">
                                        !
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-bold text-neutral-800 group-hover:text-red-700 block truncate transition-colors">{task.name}</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10px] text-neutral-500">{task.projectName}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full shadow-sm shadow-red-200">
                                            {task.daysOverdue}d late
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : <EmptyState text="No overdue tasks 🎉" />
                )}

                {/* === PROJECTS VIEW === */}
                {mode === "projects" && (
                    PROJECTS_OVERDUE.length > 0 ? (
                        <div className="grid gap-3">
                            {PROJECTS_OVERDUE.map(project => (
                                <Link key={project.id} href={`/flow/projects/${project.id}`} className="block p-4 rounded-2xl border border-red-200 bg-red-50/30 hover:border-red-300 hover:shadow-md transition-all group">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-red-400">{project.id}</span>
                                                <span className="text-sm font-semibold text-neutral-900 group-hover:text-red-700">{project.name}</span>
                                            </div>
                                            <span className="text-xs text-red-600/80 flex items-center gap-1 mt-0.5"><AlertCircle className="w-3 h-3" /> {project.issue}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">{project.daysOverdue}d</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                                        <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3" /> {project.tasksOverdue} overdue tasks</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : <EmptyState text="No projects with overdue items 🎉" />
                )}

                {/* === NOTIFICATIONS VIEW === */}
                {mode === "notifications" && (
                    NOTIFICATIONS_OVERDUE.length > 0 ? (
                        <div className="rounded-2xl border border-orange-100 bg-white shadow-sm overflow-hidden divide-y divide-orange-50">
                            {NOTIFICATIONS_OVERDUE.map(notif => (
                                <Link key={notif.id} href={notif.link} className="flex items-start gap-4 p-4 hover:bg-orange-50/30 transition-all group border-b border-orange-50 last:border-b-0">
                                    <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
                                        notif.type === "approval" ? "bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600" :
                                            "bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600"
                                    )}>
                                        {notif.type === "approval" && <Clock className="w-5 h-5" />}
                                        {notif.type === "signature" && <FileCheck className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <p className="text-xs font-bold text-neutral-900">{notif.user}</p>
                                        </div>
                                        <p className="text-xs text-neutral-600 leading-relaxed mb-2 group-hover:text-orange-900 transition-colors">
                                            {notif.text}
                                        </p>
                                        <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md font-bold">
                                            {notif.daysOverdue} days waiting
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : <EmptyState text="No pending items 🎉" />
                )}

            </div>
        </div>
    );
}

// --- HELPER COMPONENTS ---

function TabButton({ active, onClick, icon, label, color, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; color: string; count?: number }) {
    const colorClasses: Record<string, string> = {
        red: "bg-red-100 text-red-700 border-red-200",
        orange: "bg-orange-100 text-orange-700 border-orange-200",
        amber: "bg-amber-100 text-amber-700 border-amber-200",
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
        <div className="flex flex-col items-center justify-center gap-3 h-32 text-neutral-400 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50">
            <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-neutral-100 flex items-center justify-center">
                <Inbox className="w-4 h-4 opacity-50" />
            </div>
            <span className="text-xs font-medium italic">{text}</span>
        </div>
    );
}
