"use client";

import Link from "next/link";
import clsx from "clsx";
import { CheckSquare, FolderKanban, Briefcase, AlertCircle, ArrowRight, Inbox, TrendingUp, MessageSquare, Bell } from "lucide-react";

// ==========================================================================
// MOCK DATA (CLEARED FOR LIVE)
// ==========================================================================

const STATS = {
    tasksDueToday: 0,
    activeProjects: 0,
    pendingApprovals: 0,
};

const TODAYS_FOCUS: any[] = [];

const NEEDS_ATTENTION: any[] = [];

const PROGRESS = {
    thisWeek: { completed: 0, inProgress: 0, overdueRemaining: 0 },
    thisMonth: { completed: 0, avgPerWeek: 0 },
};

const PROJECT_UPDATES: any[] = [];

const RECENT_ACTIVITY: any[] = [];

// ==========================================================================
// MAIN COMPONENT (Two-Column Layout)
// ==========================================================================

export function DashboardOverview() {
    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* === ROW 1: SUMMARY CARDS === */}
            <div className="grid grid-cols-3 gap-3">
                <StatCard label="Tasks Due Today" value={STATS.tasksDueToday} icon={CheckSquare} color="blue" />
                <StatCard label="Active Projects" value={STATS.activeProjects} icon={FolderKanban} color="violet" />
                <StatCard label="Pending Approvals" value={STATS.pendingApprovals} icon={Briefcase} color="orange" />
            </div>

            {/* === ROW 2: TWO COLUMNS (Today's Focus + Needs Attention) === */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Today's Focus */}
                <PreviewSection title="Today's Focus" viewAllHref="/dashboard/tasks?section=today" viewAllLabel="My Tasks">
                    {TODAYS_FOCUS.length > 0 ? TODAYS_FOCUS.map(task => (
                        <Link key={task.id} href={`/flow/projects/${task.projectId}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 transition-colors group">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">{task.time}</span>
                            <div className="min-w-0">
                                <span className="text-xs font-medium text-neutral-800 group-hover:text-neutral-900 block truncate">{task.name}</span>
                                <span className="text-[10px] text-neutral-400">{task.id} · {task.projectName}</span>
                            </div>
                        </Link>
                    )) : <EmptyPlaceholder text="No tasks due today 🎉" />}
                </PreviewSection>

                {/* Needs Attention */}
                <PreviewSection title="Needs Attention" titleIcon={<AlertCircle className="w-3.5 h-3.5 text-red-500" />} viewAllHref="/dashboard/notifications?filter=urgent" viewAllLabel="Notifications" cardStyle="border-red-100 bg-red-50/30">
                    {NEEDS_ATTENTION.length > 0 ? NEEDS_ATTENTION.map(item => (
                        <Link key={item.id} href={item.type === "approval" ? item.link! : `/flow/projects/${item.projectId}`} className="flex items-center justify-between px-3 py-2.5 hover:bg-red-100/50 transition-colors group">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", item.type === "overdue" ? "bg-red-500" : "bg-amber-500")} />
                                <span className="text-xs font-medium text-neutral-800 group-hover:text-red-700 truncate">{item.title}</span>
                            </div>
                            <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-2", item.type === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                                {item.type === "overdue" ? `${item.daysLate}d` : "APV"}
                            </span>
                        </Link>
                    )) : <EmptyPlaceholder text="All clear! 🎉" />}
                </PreviewSection>
            </div>

            {/* === ROW 3: YOUR PROGRESS (Full Width) === */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-neutral-900">Your Progress</h3>
                    <Link href="/dashboard/tasks?section=completed" className="text-[10px] font-medium text-neutral-400 hover:text-neutral-700 flex items-center gap-0.5">
                        View completed <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50">
                        <p className="text-[10px] font-semibold text-blue-600 mb-1">This week so far</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-blue-700">{PROGRESS.thisWeek.completed}</span>
                            <span className="text-[10px] text-blue-500">done</span>
                            <span className="text-[10px] text-neutral-400 ml-2">· {PROGRESS.thisWeek.inProgress} in progress</span>
                        </div>
                    </div>
                    <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50">
                        <p className="text-[10px] font-semibold text-emerald-600 mb-1">This month</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-emerald-700">{PROGRESS.thisMonth.completed}</span>
                            <span className="text-[10px] text-emerald-500">done</span>
                            <span className="text-[10px] text-neutral-400 ml-2">· ~{PROGRESS.thisMonth.avgPerWeek}/week</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* === ROW 4: TWO COLUMNS (Projects + Activity) === */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* My Projects */}
                <PreviewSection title="My Projects" viewAllHref="/dashboard/projects" viewAllLabel="All Projects">
                    {PROJECT_UPDATES.length > 0 ? PROJECT_UPDATES.map(project => (
                        <Link key={project.id} href={`/flow/projects/${project.id}`} className="flex items-center justify-between px-3 py-2.5 hover:bg-neutral-50 transition-colors group">
                            <div className="min-w-0">
                                <span className="text-xs font-medium text-neutral-800 group-hover:text-neutral-900 block truncate">{project.name}</span>
                                <span className="text-[10px] text-neutral-400">{project.update}</span>
                            </div>
                            <span className="text-[10px] text-neutral-400 shrink-0 ml-2">{project.time}</span>
                        </Link>
                    )) : <EmptyPlaceholder text="No updates" />}
                </PreviewSection>

                {/* Recent Activity */}
                <PreviewSection title="Recent Activity" viewAllHref="/dashboard/notifications" viewAllLabel="All">
                    {RECENT_ACTIVITY.length > 0 ? RECENT_ACTIVITY.map(item => (
                        <Link key={item.id} href={item.link} className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 transition-colors group">
                            <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                                item.icon === "comment" ? "bg-blue-100 text-blue-600" :
                                    item.icon === "approval" ? "bg-emerald-100 text-emerald-600" : "bg-neutral-100 text-neutral-500"
                            )}>
                                {item.icon === "comment" && <MessageSquare className="w-3 h-3" />}
                                {item.icon === "approval" && <CheckSquare className="w-3 h-3" />}
                                {(item.icon === "update" || item.icon === "mention") && <Bell className="w-3 h-3" />}
                            </div>
                            <p className="text-[11px] text-neutral-600 flex-1 truncate">
                                <span className="font-semibold text-neutral-800">{item.user}</span> {item.action} <span className="font-medium">{item.target}</span>
                            </p>
                            <span className="text-[10px] text-neutral-400 shrink-0">{item.time}</span>
                        </Link>
                    )) : <EmptyPlaceholder text="No activity" />}
                </PreviewSection>
            </div>

        </div>
    );
}

// ==========================================================================
// HELPER COMPONENTS
// ==========================================================================

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: "blue" | "violet" | "orange" }) {
    const c = {
        blue: { bg: "bg-blue-50", text: "text-blue-600" },
        violet: { bg: "bg-violet-50", text: "text-violet-600" },
        orange: { bg: "bg-orange-50", text: "text-orange-600" },
    }[color];
    return (
        <div className="p-3 rounded-xl border border-neutral-200 bg-white">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[9px] font-medium text-neutral-500 uppercase tracking-wide">{label}</p>
                    <p className="text-2xl font-bold text-neutral-900">{value}</p>
                </div>
                <div className={clsx("p-2 rounded-lg", c.bg, c.text)}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}

function PreviewSection({ title, titleIcon, viewAllHref, viewAllLabel = "View all", children, cardStyle }: {
    title: string;
    titleIcon?: React.ReactNode;
    viewAllHref: string;
    viewAllLabel?: string;
    children: React.ReactNode;
    cardStyle?: string;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-900 flex items-center gap-1">{titleIcon}{title}</h3>
                <Link href={viewAllHref} className="text-[10px] font-medium text-neutral-400 hover:text-neutral-700 flex items-center gap-0.5">
                    {viewAllLabel} <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
            <div className={clsx("rounded-xl border border-neutral-200 bg-white overflow-hidden divide-y divide-neutral-100", cardStyle)}>
                {children}
            </div>
        </div>
    );
}

function EmptyPlaceholder({ text = "No items" }: { text?: string }) {
    return (
        <div className="flex items-center justify-center gap-2 h-20 text-xs text-neutral-400 italic">
            <Inbox className="w-4 h-4" /> {text}
        </div>
    );
}
