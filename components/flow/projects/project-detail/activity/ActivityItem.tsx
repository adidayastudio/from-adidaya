"use client";

import {
    CheckCircle2,
    FileText,
    Calendar,
    MessageSquare,
    AlertCircle,
    Clock,
    Circle
} from "lucide-react";
import clsx from "clsx";

export type ActivityType = "task" | "meeting" | "doc" | "comment" | "alert";

export type ActivityStatus =
    | "not-started"
    | "in-progress"
    | "in-review"
    | "need-revision"
    | "approved";

interface ActivityItemProps {
    type: ActivityType;
    title: string;
    context: string; // e.g. "Stage 02-SD", "WBS 4.2"
    tag: string;     // e.g. "Design", "Site"
    time: string;    // e.g. "Due Today", "Yesterday"
    assignee?: string;
    status?: ActivityStatus;
    onClick?: () => void;
}

export default function ActivityItem({
    type,
    title,
    context,
    tag,
    time,
    assignee,
    status = "not-started",
    onClick
}: ActivityItemProps) {

    const icon = getIcon(type);
    const iconColor = getIconColor(type);
    const initials = assignee ? getInitials(assignee) : "";

    return (
        <div
            onClick={onClick}
            className="group flex cursor-pointer items-center justify-between rounded-lg p-3 transition-all hover:bg-neutral-50 hover:shadow-sm border border-transparent hover:border-neutral-100"
        >
            <div className="flex items-center gap-4">
                {/* ICON BOX */}
                <div className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-50 transition-colors group-hover:bg-white pb-0.5", iconColor)}>
                    {icon}
                </div>

                {/* TEXT */}
                <div>
                    <h4 className="text-sm font-semibold text-neutral-900 leading-snug">
                        {title}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-neutral-500">
                        {/* CONTEXT . TAG . TIME */}
                        <span className="text-neutral-700">{context}</span>
                        <span className="text-neutral-300">•</span>
                        <span className="uppercase text-neutral-600 tracking-wide">{tag}</span>
                        <span className="text-neutral-300">•</span>
                        <span className="text-neutral-400">{time}</span>
                    </div>
                </div>
            </div>

            {/* META / ASSIGNEE */}
            <div className="flex items-center gap-3">
                <StatusBadge status={status} />

                {assignee && (
                    <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-600 ring-2 ring-white uppercase" title={assignee}>
                        {initials}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ================= HELPERS ================= */

function getInitials(name: string) {
    if (name.toLowerCase() === "finance") return "FI";
    if (name.toLowerCase() === "logistics") return "LG";
    if (name.toLowerCase() === "client") return "CL";
    if (name.toLowerCase() === "me") return "ME";
    return name.substring(0, 2).toUpperCase();
}

function getIcon(type: ActivityType) {
    switch (type) {
        case "task": return <CheckCircle2 className="h-5 w-5" />;
        case "meeting": return <Calendar className="h-5 w-5" />;
        case "doc": return <FileText className="h-5 w-5" />;
        case "comment": return <MessageSquare className="h-5 w-5" />;
        case "alert": return <AlertCircle className="h-5 w-5" />;
        default: return <Clock className="h-5 w-5" />;
    }
}

function getIconColor(type: ActivityType) {
    switch (type) {
        case "task": return "text-blue-600 bg-blue-50 group-hover:bg-blue-100";
        case "meeting": return "text-purple-600 bg-purple-50 group-hover:bg-purple-100";
        case "doc": return "text-orange-600 bg-orange-50 group-hover:bg-orange-100";
        case "alert": return "text-red-600 bg-red-50 group-hover:bg-red-100";
        default: return "text-neutral-500";
    }
}

function StatusBadge({ status }: { status: ActivityStatus }) {
    switch (status) {
        case "approved":
            return <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700">Approved</span>;
        case "in-progress":
            return <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">In Progress</span>;
        case "in-review":
            return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">In Review</span>;
        case "need-revision":
            return <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">Need Revision</span>;
        case "not-started":
        default:
            return <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-500">Not Started</span>;
    }
}
