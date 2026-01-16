"use client";

import { Button } from "@/shared/ui/primitives/button/button";
import { Download, Plus } from "lucide-react";
import { TrackingItem } from "./data";
import clsx from "clsx";

export default function TrackingRabTab({ items }: { items: TrackingItem[] }) {
    return (
        <div className="space-y-4">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-neutral-900">RAB & Budget</h3>
                    <p className="text-xs text-neutral-500">Track estimated vs actual costs.</p>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="secondary" icon={<Download className="w-4 h-4" />}>Export</Button>
                    <Button size="sm" icon={<Plus className="w-4 h-4" />}>New Item</Button>
                </div>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-neutral-100 bg-white">
                    <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Total Budget</div>
                    <div className="text-lg font-bold text-neutral-900">Rp 1.200.000.000</div>
                </div>
                <div className="p-4 rounded-xl border border-neutral-100 bg-white">
                    <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Actual Spend</div>
                    <div className="text-lg font-bold text-neutral-900">Rp 450.000.000</div>
                </div>
                <div className="p-4 rounded-xl border border-neutral-100 bg-white">
                    <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Remaining</div>
                    <div className="text-lg font-bold text-green-600">Rp 750.000.000</div>
                </div>
            </div>

            {/* CONTENT: RAB LIST */}
            <div className="rounded-xl border border-neutral-100 bg-white overflow-hidden shadow-sm">
                {items.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500 text-sm">No items found matching filter</div>
                ) : (
                    items.map((item, i) => (
                        <div key={item.id} className="flex items-center gap-4 px-4 py-3 border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm font-medium text-neutral-700">{item.title}</span>
                                    <span className="text-xs font-semibold text-neutral-500">{item.progress}%</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                                    <div className="h-full bg-yellow-500 transition-all" style={{ width: `${item.progress}%` }} />
                                </div>
                                <div className="mt-1 text-xs text-neutral-400">{item.subtitle}</div>
                            </div>
                            <div className="w-24 text-right">
                                <span className={clsx("text-[10px] uppercase font-bold px-2 py-1 rounded-full tracking-wider",
                                    item.status === "Completed" ? "bg-green-100 text-green-700" :
                                        item.status === "In Progress" ? "bg-orange-50 text-orange-600" :
                                            "bg-neutral-100 text-neutral-500"
                                )}>
                                    {item.status}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
