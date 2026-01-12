"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CheckSquare, FolderKanban, Bell, Inbox, Clock, MessageCircle, FileCheck, AlertCircle } from "lucide-react";

type ViewMode = "tasks" | "projects" | "notifications";

// --- MOCK DATA: TODAY (Proper Code Formats) ---
// Tasks: KO-XX-NN | Projects: 3-letter | Requests: REQ-NN | Approvals: APV-NN
const TASKS_TODAY = [
    { id: "KO-01-01", name: "Review JPF Design", time: "10:00", projectId: "JPF", projectName: "JPF House" },
    { id: "KO-01-02", name: "Client Meeting Prep", time: "13:30", projectId: "JPF", projectName: "JPF House" },
    { id: "KO-02-01", name: "Update Weekly Report", time: null, projectId: "UPC", projectName: "Urban Park" },
    { id: "KO-02-02", name: "Submit Invoice", time: null, projectId: "UPC", projectName: "Urban Park" },
    { id: "KO-03-01", name: "Finalize Material List", time: "16:00", projectId: "SKY", projectName: "Skyline Tower" },
];
const PROJECTS_TODAY = [
    { id: "JPF", name: "JPF House", stage: "Schematic Design", tasksToday: 2, progress: 65, color: "blue" },
    { id: "UPC", name: "Urban Park Concept", stage: "Concept", tasksToday: 2, progress: 30, color: "emerald" },
    { id: "SKY", name: "Skyline Tower", stage: "Construction Docs", tasksToday: 1, progress: 85, color: "violet" },
];
const NOTIFICATIONS_TODAY = [
    { id: "APV-001", text: "Leave request awaiting your approval", user: "Andi Pratama", type: "approval", time: "09:15", link: "/dashboard/notifications" },
    { id: "REQ-001", text: "Commented on Design Review", user: "Sarah M.", type: "comment", time: "10:30", link: "/flow/projects/JPF" },
    { id: "REQ-002", text: "Submitted expense report for review", user: "Budi S.", type: "submission", time: "14:00", link: "/dashboard/notifications" },
];

export function DashboardToday() {
    const [mode, setMode] = useState<ViewMode>("tasks");
    const today = new Date();

    // Separate timed vs untimed tasks
    const timedTasks = TASKS_TODAY.filter(t => t.time).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    const untimedTasks = TASKS_TODAY.filter(t => !t.time);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* HEADER + DATE */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-neutral-900">Today</h2>
                <span className="text-xs text-neutral-500">{today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
            </div>

            {/* TOGGLE (COLORFUL TABS) */}
            <div className="flex items-center gap-2">
                <TabButton active={mode === "tasks"} onClick={() => setMode("tasks")} icon={<CheckSquare className="w-4 h-4" />} label="Tasks" color="blue" count={TASKS_TODAY.length} />
                <TabButton active={mode === "projects"} onClick={() => setMode("projects")} icon={<FolderKanban className="w-4 h-4" />} label="Projects" color="violet" count={PROJECTS_TODAY.length} />
                <TabButton active={mode === "notifications"} onClick={() => setMode("notifications")} icon={<Bell className="w-4 h-4" />} label="Inbox" color="orange" count={NOTIFICATIONS_TODAY.length} />
            </div>

            {/* CONTENT */}
            <div className="space-y-4">

                {/* === TASKS VIEW (TIMELINE + LIST) === */}
                {mode === "tasks" && (
                    <>
                        {timedTasks.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1"><Clock className="w-3 h-3" /> Scheduled</p>
                                <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                                    {timedTasks.map((task, i) => (
                                        <Link key={task.id} href={`/flow/projects/${task.projectId}`} className="flex items-start gap-3 p-3 hover:bg-neutral-50 transition-colors group border-b border-neutral-100 last:border-b-0">
                                            <div className="flex flex-col items-center pt-0.5">
                                                <span className="text-xs font-bold text-blue-600">{task.time}</span>
                                                {i < timedTasks.length - 1 && <div className="w-px h-6 bg-blue-200 mt-1" />}
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-xs font-medium text-neutral-800 group-hover:text-blue-600 block">{task.name}</span>
                                                <span className="text-[10px] text-neutral-400">{task.id} · {task.projectName}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                        {untimedTasks.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Anytime</p>
                                <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden divide-y divide-neutral-100">
                                    {untimedTasks.map(task => (
                                        <Link key={task.id} href={`/flow/projects/${task.projectId}`} className="flex items-center justify-between px-3 py-2.5 hover:bg-neutral-50 transition-colors group">
                                            <div className="flex-1 min-w-0">
                                                <span className="text-xs font-medium text-neutral-700 group-hover:text-neutral-900 block truncate">{task.name}</span>
                                                <span className="text-[10px] text-neutral-400">{task.id} · {task.projectName}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                        {TASKS_TODAY.length === 0 && <EmptyState text="No tasks for today" />}
                    </>
                )}

                {/* === PROJECTS VIEW (RICH CARDS) === */}
                {mode === "projects" && (
                    PROJECTS_TODAY.length > 0 ? (
                        <div className="grid gap-3">
                            {PROJECTS_TODAY.map(project => (
                                <Link key={project.id} href={`/flow/projects/${project.id}`} className="block p-4 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm transition-all group">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-neutral-400">{project.id}</span>
                                                <span className="text-sm font-semibold text-neutral-900 group-hover:text-violet-600">{project.name}</span>
                                            </div>
                                            <span className="text-xs text-neutral-500 block">{project.stage}</span>
                                        </div>
                                        <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", project.tasksToday > 0 ? "bg-blue-100 text-blue-700" : "bg-neutral-100 text-neutral-500")}>{project.tasksToday} tasks</span>
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
                    ) : <EmptyState text="No projects with activity today" />
                )}

                {/* === NOTIFICATIONS VIEW (DETAILED) === */}
                {mode === "notifications" && (
                    NOTIFICATIONS_TODAY.length > 0 ? (
                        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden divide-y divide-neutral-100">
                            {NOTIFICATIONS_TODAY.map(notif => (
                                <Link key={notif.id} href={notif.link} className="flex items-start gap-3 p-3 hover:bg-neutral-50 transition-colors group">
                                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0", notif.type === "approval" ? "bg-orange-100 text-orange-600" : notif.type === "comment" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600")}>
                                        {notif.type === "approval" && <AlertCircle className="w-4 h-4" />}
                                        {notif.type === "comment" && <MessageCircle className="w-4 h-4" />}
                                        {notif.type === "submission" && <FileCheck className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-neutral-600 group-hover:text-neutral-900">
                                            <span className="font-semibold text-neutral-800">{notif.user}</span>&nbsp;{notif.text}
                                        </p>
                                        <span className="text-[10px] text-neutral-400">{notif.time}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : <EmptyState text="No notifications today" />
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
        <div className="flex items-center justify-center gap-2 h-28 text-xs text-neutral-400 italic rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50">
            <Inbox className="w-4 h-4" /> {text}
        </div>
    );
}
