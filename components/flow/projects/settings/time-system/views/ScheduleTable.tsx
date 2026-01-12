"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Calendar, ChevronRight, ChevronDown } from "lucide-react";
import { format } from "date-fns";

interface ScheduleTableProps {
    items: any[];
    onUpdate: () => void;
}

export function ScheduleTable({ items, onUpdate }: ScheduleTableProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedIds(newExpanded);
    };

    // Helper to format date or show placeholder
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        return format(new Date(dateStr), "dd MMM yyyy");
    };

    const updateDuration = async (wbsId: string, field: 'duration_ballpark' | 'duration_estimates', value: string) => {
        const numValue = parseInt(value);
        if (isNaN(numValue)) return;

        try {
            const { error } = await supabase
                .from("project_schedule_items")
                .upsert({
                    wbs_id: wbsId,
                    [field]: numValue
                }, { onConflict: 'wbs_id' });

            if (error) throw error;
            onUpdate();
        } catch (err) {
            console.error("Failed to update duration", err);
        }
    };

    return (
        <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                        <th className="px-4 py-3 font-medium text-neutral-600 w-[300px]">WBS Item</th>
                        <th className="px-4 py-3 font-medium text-neutral-600 w-[120px]">Est. Days (Ballpark)</th>
                        <th className="px-4 py-3 font-medium text-neutral-600 w-[120px]">Est. Days (Final)</th>
                        <th className="px-4 py-3 font-medium text-neutral-600 w-[120px]">Start Date</th>
                        <th className="px-4 py-3 font-medium text-neutral-600 w-[120px]">End Date</th>
                        <th className="px-4 py-3 font-medium text-neutral-600 w-[80px]">Weight</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                    {items.length === 0 && (
                        <tr>
                            <td colSpan={6} className="text-center py-12 text-neutral-500">
                                No WBS items found. Please setup WBS first.
                            </td>
                        </tr>
                    )}
                    {items.map((item) => {
                        const depth = (item.wbs_code?.split('.').length || 1) - 1;
                        const paddingLeft = `${depth * 24 + 16}px`;
                        // Simple check for children based on wbs_code logic (e.g. 1.1 is child of 1)
                        // Ideally the items are ordered so we can check if next item starts with this code
                        // But for now, we rely on the passed items or external logic.
                        // Let's assume passed items are flat list.
                        const hasChildren = items.some(i => i.wbs_code?.startsWith(item.wbs_code + '.') && i.wbs_code !== item.wbs_code);
                        // Handle potential array or object response from Supabase join
                        const scheduleRaw = item.schedule;
                        const schedule = Array.isArray(scheduleRaw) ? scheduleRaw[0] : (scheduleRaw || {});

                        return (
                            <tr key={item.id} className="hover:bg-neutral-50 group">
                                <td className="p-0">
                                    <div className="flex items-center h-full py-2 pr-4" style={{ paddingLeft }}>
                                        {hasChildren && (
                                            <button onClick={() => toggleExpand(item.id)} className="mr-2 p-1 hover:bg-neutral-200 rounded text-neutral-500">
                                                {expandedIds.has(item.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </button>
                                        )}
                                        {!hasChildren && <div className="w-6 mr-2" />}
                                        <span className={`truncate ${hasChildren ? "font-semibold text-neutral-900" : "text-neutral-600"}`}>
                                            {item.wbs_code} {item.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="number"
                                        className="w-20 px-2 py-1.5 text-sm border border-transparent hover:border-neutral-300 rounded focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none bg-transparent transition-colors"
                                        placeholder="-"
                                        defaultValue={schedule.duration_ballpark || ""}
                                        onBlur={(e) => updateDuration(item.id, 'duration_ballpark', e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="number"
                                        className="w-20 px-2 py-1.5 text-sm border border-transparent hover:border-neutral-300 rounded focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none bg-transparent transition-colors"
                                        placeholder="-"
                                        defaultValue={schedule.duration_estimates || ""}
                                        onBlur={(e) => updateDuration(item.id, 'duration_estimates', e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2 text-sm text-neutral-500">
                                    {schedule.start_date ? formatDate(schedule.start_date) : <span className="text-neutral-300">-</span>}
                                </td>
                                <td className="px-4 py-2 text-sm text-neutral-500">
                                    {schedule.end_date ? formatDate(schedule.end_date) : <span className="text-neutral-300">-</span>}
                                </td>
                                <td className="px-4 py-2 text-sm text-neutral-500">
                                    {schedule.weight_percentage || 0}%
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
