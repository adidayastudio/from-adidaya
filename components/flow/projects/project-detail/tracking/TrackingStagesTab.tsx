import { Button } from "@/shared/ui/primitives/button/button";
import { TrackingItem } from "./data";
import clsx from "clsx";

export default function TrackingStagesTab({ items }: { items: TrackingItem[] }) {
    return (
        <div className="space-y-4">
            {/* HEADER / ACTIONS */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-900">Stage Progress</h3>
                <Button size="sm" variant="secondary">Update Progress</Button>
            </div>

            {/* CONTENT: STAGE LIST */}
            <div className="rounded-xl border border-neutral-100 bg-white overflow-hidden shadow-sm">
                {items.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500 text-sm">No items found matching filter</div>
                ) : (
                    items.map((stage, i) => (
                        <div key={stage.id} className="flex items-center gap-4 px-4 py-3 border-b border-neutral-100 last:border-0">
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm font-medium text-neutral-700">{stage.title}</span>
                                    <span className="text-xs font-semibold text-neutral-500">{stage.progress}%</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                                    <div className="h-full bg-brand-red transition-all" style={{ width: `${stage.progress}%` }} />
                                </div>
                                <div className="mt-1 text-xs text-neutral-400">{stage.subtitle}</div>
                            </div>
                            <div className="w-24 text-right">
                                <span className={clsx("text-[10px] uppercase font-bold px-2 py-1 rounded-full",
                                    stage.status === "Completed" ? "bg-green-100 text-green-700" :
                                        stage.status === "In Progress" ? "bg-blue-50 text-blue-700" :
                                            "bg-neutral-50 text-neutral-500"
                                )}>
                                    {stage.status}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
