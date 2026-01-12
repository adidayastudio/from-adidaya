import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { SocialPost, SocialAccount, PostStatus } from "./types/social.types";

type Props = {
    posts: SocialPost[];
    accounts: SocialAccount[];
    currentDate: Date;
    onNavigateMonth: (direction: -1 | 1) => void;
    onCreatePost: (dateStr: string) => void;
    onEditPost: (post: SocialPost) => void;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Status to background color mapping
const STATUS_COLORS: Partial<Record<PostStatus, string>> = {
    NOT_STARTED: "bg-neutral-100",
    TODO: "bg-neutral-100",
    WRITING: "bg-orange-100",
    DESIGNING: "bg-purple-100",
    IN_REVIEW: "bg-yellow-100",
    NEED_APPROVAL: "bg-amber-100",
    APPROVED: "bg-blue-100",
    SCHEDULED: "bg-blue-100",
    PUBLISHED: "bg-green-100"
};

const PLATFORM_COLORS: Record<string, string> = {
    INSTAGRAM: "bg-pink-500",
    TIKTOK: "bg-neutral-800",
    LINKEDIN: "bg-blue-600",
    YOUTUBE: "bg-red-500",
    FACEBOOK: "bg-blue-500"
};

export default function SocialPlannerView({ posts, accounts, currentDate, onNavigateMonth, onCreatePost, onEditPost }: Props) {

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

    // RENDER POST PILL
    const PostPill = ({ post }: { post: SocialPost }) => {
        const account = accounts?.find(a => a.id === post.accountId);
        const statusBg = STATUS_COLORS[post.status] || "bg-neutral-100";
        const platformColor = account ? PLATFORM_COLORS[account.platform] : "bg-neutral-400";
        const accountCode = account?.name.slice(0, 3).toUpperCase() || "???";
        const isPublished = post.status === "PUBLISHED";

        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onEditPost(post);
                }}
                className={`w-full text-left px-2 py-1 mb-1 rounded text-[10px] font-medium transition-all hover:brightness-95 flex items-center gap-1.5 ${statusBg} ${isPublished ? "opacity-60" : ""}`}
            >
                {/* Platform dot */}
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${platformColor}`} />

                {/* Account code */}
                <span className="text-[8px] font-bold text-neutral-400 uppercase">{accountCode}</span>

                {/* Title */}
                <span className="truncate text-neutral-700">{post.title}</span>
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
                    <span className="w-3 h-3 rounded bg-neutral-100" /> Not Started
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-orange-100" /> In Progress
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-100" /> Ready
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-green-100" /> Published
                </div>
            </div>

            {/* CALENDAR BODY */}
            <div className="flex-1 flex flex-col border border-neutral-100 rounded-xl overflow-hidden shadow-sm bg-white">
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

                        if (!cell.day) return <div key={idx} className="bg-neutral-50/30 border-b border-r border-neutral-50" />;

                        const dayPosts = posts.filter(p => p.scheduledDate === cell.dateStr);

                        return (
                            <div
                                key={cell.dateStr}
                                className="group relative border-b border-r border-neutral-100 p-2 min-h-[100px] hover:bg-neutral-50/50 transition-colors cursor-pointer"
                                onClick={() => onCreatePost(cell.dateStr!)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-xs font-semibold ${isToday ? "text-white bg-neutral-900 w-6 h-6 flex items-center justify-center rounded-full" : "text-neutral-400"}`}>
                                        {cell.day}
                                    </span>

                                    <button
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-200 text-neutral-400 transition-all"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCreatePost(cell.dateStr!);
                                        }}
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>

                                {/* POSTS */}
                                <div className="space-y-0.5 overflow-hidden max-h-[80px]">
                                    {dayPosts.slice(0, 3).map(post => <PostPill key={post.id} post={post} />)}
                                    {dayPosts.length > 3 && (
                                        <div className="text-[9px] text-neutral-400 text-center">+{dayPosts.length - 3} more</div>
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
