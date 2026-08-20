"use client";

import React from "react";
import type { FeedItem } from "@/lib/stream/types";

interface InboxViewProps {
    feedItems: FeedItem[];
}

export default function InboxView({ feedItems }: InboxViewProps) {
    return (
        <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 max-w-5xl scrollbar-hide">
            <h2 className="text-[20px] font-bold text-neutral-900 dark:text-white">Inbox &amp; Pending Review</h2>
            <div className="space-y-3">
                {feedItems.filter(i => i.status === "pending").map((item) => (
                    <div key={item.id} className="p-4 rounded-[20px] bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 flex items-center justify-between">
                        <h3 className="text-[14px] font-bold">{item.title}</h3>
                        <button className="px-3.5 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[12px] font-bold">Review</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
