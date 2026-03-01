import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { SocialPost, SocialAccount, PostStatus } from "./types/social.types";
import clsx from "clsx";

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
                className={clsx(
                    "w-full text-left px-2 py-1 mb-1 rounded text-[10px] font-medium transition-all hover:brightness-95 flex items-center gap-1.5",
                    statusBg,
                    isPublished && "opacity-60"
                )}
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
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* HEADER */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-[32px] font-extrabold text-neutral-900 tracking-tight leading-none">{monthLabel}</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onNavigateMonth(-1)}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-neutral-100 rounded-full shadow-sm text-neutral-500 hover:text-orange-500 hover:border-orange-100 transition-all active:scale-95"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onNavigateMonth(1)}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-neutral-100 rounded-full shadow-sm text-neutral-500 hover:text-orange-500 hover:border-orange-100 transition-all active:scale-95"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* LEGEND */}
            <div className="flex items-center gap-6 mb-6 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-100" /> Not Started
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-100" /> In Progress
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-100" /> Ready
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-100" /> Published
                </div>
            </div>

            {/* CALENDAR BODY */}
            <div className="flex-1 flex flex-col border border-neutral-100 rounded-[32px] overflow-hidden shadow-sm bg-white">
                {/* DAYS HEADER */}
                <div className="grid grid-cols-7 border-b border-neutral-100 bg-neutral-50/30">
                    {DAYS.map(day => (
                        <div key={day} className="py-4 text-center text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em]">
                            {day}
                        </div>
                    ))}
                </div>

                {/* GRID */}
                <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                    {grid.map((cell, idx) => {
                        const isToday = cell.day === new Date().getDate() && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

                        if (!cell.day) return <div key={idx} className="bg-neutral-50/20 border-b border-r border-neutral-100/50" />;

                        const dayPosts = posts.filter(p => p.scheduledDate === cell.dateStr);

                        return (
                            <div
                                key={cell.dateStr}
                                className="group relative border-b border-r border-neutral-100 p-2.5 min-h-[110px] hover:bg-neutral-50/50 transition-colors cursor-pointer"
                                onClick={() => onCreatePost(cell.dateStr!)}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className={clsx(
                                        "text-xs font-bold",
                                        isToday ? "text-white bg-neutral-900 w-7 h-7 flex items-center justify-center rounded-full" : "text-neutral-400"
                                    )}>
                                        {cell.day}
                                    </span>

                                    <button
                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-neutral-200 text-neutral-400 transition-all"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCreatePost(cell.dateStr!);
                                        }}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* POSTS */}
                                <div className="space-y-1 overflow-hidden max-h-[85px]">
                                    {dayPosts.slice(0, 3).map(post => <PostPill key={post.id} post={post} />)}
                                    {dayPosts.length > 3 && (
                                        <div className="text-[9px] font-bold text-neutral-300 text-center mt-1">
                                            +{dayPosts.length - 3} MORE
                                        </div>
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
