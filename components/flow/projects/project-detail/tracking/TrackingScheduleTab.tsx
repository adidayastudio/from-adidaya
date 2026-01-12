"use client";

import { Button } from "@/shared/ui/primitives/button/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { TrackingItem } from "./data";

export default function TrackingScheduleTab({ items }: { items: TrackingItem[] }) {
    return (
        <div className="space-y-4">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-900">Project Schedule</h3>
                <Button size="sm" variant="secondary" icon={<CalendarIcon className="w-4 h-4" />}>
                    View Calendar
                </Button>
            </div>

            {/* GANTT MOCK */}
            <div className="rounded-xl border border-neutral-100 bg-white p-6 relative overflow-hidden">
                {/* Timeline header */}
                <div className="flex border-b border-neutral-100 pb-2 mb-4">
                    <div className="w-1/4 text-xs font-bold text-neutral-400 uppercase">Task</div>
                    <div className="flex-1 flex justify-between text-xs text-neutral-400">
                        <span>Week 1</span>
                        <span>Week 2</span>
                        <span>Week 3</span>
                        <span>Week 4</span>
                    </div>
                </div>

                {/* Timeline Rows */}
                <div className="space-y-4 relative">
                    {items.length === 0 ? (
                        <div className="text-center text-sm text-neutral-500 py-4">No schedule items found.</div>
                    ) : (
                        items.map((item, i) => (
                            <div key={item.id} className="flex items-center group">
                                <div className="w-1/4 text-sm font-medium text-neutral-700">{item.title}</div>
                                <div className="flex-1 relative h-6 bg-neutral-50 rounded-full">
                                    <div
                                        className="absolute h-full rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                                        style={{
                                            width: `${item.progress === 100 ? '100%' : '30%'}`,
                                            left: `${i * 10}%`,
                                            backgroundColor: item.tag === 'Site' ? '#3b82f6' : '#a855f7' // Blue/Purple based on tag
                                        }}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
