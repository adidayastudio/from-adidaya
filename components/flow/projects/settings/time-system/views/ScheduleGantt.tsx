"use client";

import { useMemo } from "react";
import { format, differenceInDays, addDays, isValid, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { ChevronRight, ChevronDown } from "lucide-react";

interface ScheduleGanttProps {
    items: any[];
}

export function ScheduleGantt({ items }: ScheduleGanttProps) {
    // 1. Calculate timeline range
    const { startDate, endDate, totalDays } = useMemo(() => {
        let minDate = new Date();
        let maxDate = addDays(new Date(), 30);

        const activeItems = items.filter(i => i.schedule?.start_date && i.schedule?.end_date);

        if (activeItems.length > 0) {
            const starts = activeItems.map(i => new Date(i.schedule.start_date).getTime());
            const ends = activeItems.map(i => new Date(i.schedule.end_date).getTime());
            minDate = new Date(Math.min(...starts));
            maxDate = new Date(Math.max(...ends));
        }

        // Add buffer
        minDate = startOfWeek(addDays(minDate, -7));
        maxDate = endOfWeek(addDays(maxDate, 7));

        return {
            startDate: minDate,
            endDate: maxDate,
            totalDays: differenceInDays(maxDate, minDate) + 1
        };
    }, [items]);

    // 2. Generate timeline headers
    const days = useMemo(() => {
        if (!isValid(startDate) || !isValid(endDate)) return [];
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [startDate, endDate]);

    const CELL_WIDTH = 40; // px
    const HEADER_HEIGHT = 60;

    return (
        <div className="flex border border-neutral-200 rounded-lg bg-white overflow-hidden h-[600px]">
            {/* Left Panel: List */}
            <div className="w-[300px] border-r border-neutral-200 flex flex-col shrink-0">
                <div className="h-[60px] border-b border-neutral-200 bg-neutral-50 px-4 flex items-center font-semibold text-sm text-neutral-600">
                    Task Name
                </div>
                <div className="flex-1 overflow-y-hidden bg-white">
                    {/* Synced scroll via JS usually needed, simplistic key based here */}
                    {items.map((item, i) => (
                        <div key={item.id} className="h-10 border-b border-neutral-100 flex items-center px-4 text-sm truncate hover:bg-neutral-50" title={item.name}>
                            <span className="text-neutral-500 font-mono mr-2 text-xs">{item.wbs_code}</span>
                            {item.name}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: Chart */}
            <div className="flex-1 overflow-x-auto overflow-y-auto relative">
                <div className="absolute top-0 left-0 min-w-full" style={{ width: days.length * CELL_WIDTH }}>
                    {/* Header */}
                    <div className="h-[60px] border-b border-neutral-200 bg-neutral-50 flex sticky top-0 z-10">
                        {days.map((day, i) => {
                            const isMonday = day.getDay() === 1;
                            const isFirst = i === 0;
                            return (
                                <div key={day.toISOString()} style={{ width: CELL_WIDTH }} className="shrink-0 border-r border-neutral-200 text-xs flex flex-col items-center justify-center">
                                    {(isMonday || isFirst) && (
                                        <span className="font-semibold text-neutral-500 mb-1 absolute top-1">{format(day, "d MMM")}</span>
                                    )}
                                    <span className={`mt-auto mb-1 ${[0, 6].includes(day.getDay()) ? "text-red-400" : "text-neutral-400"}`}>
                                        {format(day, "eeeee")}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Bars */}
                    <div>
                        {items.map((item) => {
                            const schedule = item.schedule || {};
                            let left = 0;
                            let width = 0;
                            let visible = false;

                            if (schedule.start_date && schedule.end_date) {
                                const start = new Date(schedule.start_date);
                                const end = new Date(schedule.end_date);
                                const diffStart = differenceInDays(start, startDate);
                                const duration = differenceInDays(end, start) + 1;
                                left = diffStart * CELL_WIDTH;
                                width = duration * CELL_WIDTH;
                                visible = true;
                            }

                            return (
                                <div key={item.id} className="h-10 border-b border-neutral-100 relative group hover:bg-neutral-50/50">
                                    {/* Grid Lines */}
                                    <div className="absolute inset-0 flex pointer-events-none">
                                        {days.map((d, i) => (
                                            <div key={i} style={{ width: CELL_WIDTH }} className={`border-r border-neutral-100 h-full ${[0, 6].includes(d.getDay()) ? "bg-neutral-50/30" : ""}`} />
                                        ))}
                                    </div>

                                    {/* Bar */}
                                    {visible && (
                                        <div
                                            className="absolute top-2 h-6 rounded bg-brand-red/80 hover:bg-brand-red border border-brand-red-dark/20 shadow-sm cursor-pointer transition-colors"
                                            style={{ left, width }}
                                        >
                                            <div className="opacity-0 group-hover:opacity-100 absolute left-full ml-2 top-0 text-xs bg-black text-white px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none">
                                                {format(new Date(schedule.start_date), "d MMM")} - {format(new Date(schedule.end_date), "d MMM")}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
