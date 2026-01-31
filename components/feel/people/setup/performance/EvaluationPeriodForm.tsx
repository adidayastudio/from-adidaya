"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Save, Calendar } from "lucide-react";

export default function EvaluationPeriodForm() {
    const [period, setPeriod] = useState("monthly");
    const [snapshotDay, setSnapshotDay] = useState("1");

    return (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <h3 className="text-lg font-bold text-neutral-900 mb-1">Evaluation Cycle</h3>
            <p className="text-sm text-neutral-500 mb-6">Define when performance snapshots are automatically generated.</p>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-3">Period Type</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setPeriod("weekly")}
                            className={`p-4 rounded-xl border text-left transition-all ${period === "weekly"
                                    ? "bg-blue-50 border-blue-200 ring-2 ring-blue-500/20"
                                    : "bg-white border-neutral-200 hover:border-neutral-300"
                                }`}
                        >
                            <span className="block font-semibold text-neutral-900 mb-1">Weekly</span>
                            <span className="text-xs text-neutral-500">Snapshots generated every week. Best for fast-paced teams.</span>
                        </button>
                        <button
                            onClick={() => setPeriod("monthly")}
                            className={`p-4 rounded-xl border text-left transition-all ${period === "monthly"
                                    ? "bg-blue-50 border-blue-200 ring-2 ring-blue-500/20"
                                    : "bg-white border-neutral-200 hover:border-neutral-300"
                                }`}
                        >
                            <span className="block font-semibold text-neutral-900 mb-1">Monthly</span>
                            <span className="text-xs text-neutral-500">Standard cycle. Aggregates data over calendar months.</span>
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Snapshot Trigger Day</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <select
                            className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            value={snapshotDay}
                            onChange={(e) => setSnapshotDay(e.target.value)}
                        >
                            <option value="1">1st of the month</option>
                            <option value="15">15th of the month</option>
                            <option value="last">Last day of the month</option>
                        </select>
                    </div>
                    <p className="text-xs text-neutral-500 mt-2">
                        System will lock data and generate reports at 00:00 on selected day.
                    </p>
                </div>

                <div className="pt-6 flex justify-end">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" icon={<Save className="w-4 h-4" />}>
                        Save Settings
                    </Button>
                </div>
            </div>
        </div>
    );
}
