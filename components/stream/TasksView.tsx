"use client";

import React from "react";
import type { FeedItem } from "@/lib/stream/types";

interface TasksViewProps {
    feedItems: FeedItem[];
}

export default function TasksView({ feedItems }: TasksViewProps) {
    return (
        <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 max-w-5xl scrollbar-hide">
            <h2 className="text-[20px] font-bold text-neutral-900 dark:text-white">Operational Tasks</h2>
            <div className="space-y-3">
                {feedItems.filter(i => i.type === "task_added").map((item) => (
                    <div key={item.id} className="p-4 rounded-[20px] bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl border border-white/60 dark:border-neutral-800/40 flex items-center justify-between">
                        <h3 className="text-[14px] font-bold">{item.title}</h3>
                        <span className="text-[11px] text-neutral-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
