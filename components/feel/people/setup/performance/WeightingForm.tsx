"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Save } from "lucide-react";

export default function WeightingForm() {
    const [weights, setWeights] = useState({
        attendance: 40,
        taskCompletion: 40,
        peerReview: 20,
        includeOvertime: true
    });

    return (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
            <h3 className="text-lg font-bold text-neutral-900 mb-1">Performance Index Weighting</h3>
            <p className="text-sm text-neutral-500 mb-6">Configure how different metrics contribute to the overall performance score (0-100).</p>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Attendance & Punctuality ({weights.attendance}%)</label>
                    <input
                        type="range"
                        className="w-full"
                        min="0" max="100"
                        value={weights.attendance}
                        onChange={(e) => setWeights({ ...weights, attendance: parseInt(e.target.value) })}
                    />
                    <div className="flex justify-between text-xs text-neutral-400 mt-1">
                        <span>Low Importance</span>
                        <span>Standard</span>
                        <span>Critical</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Task Completion Rate ({weights.taskCompletion}%)</label>
                    <input
                        type="range"
                        className="w-full"
                        min="0" max="100"
                        value={weights.taskCompletion}
                        onChange={(e) => setWeights({ ...weights, taskCompletion: parseInt(e.target.value) })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Peer & 360 Review ({weights.peerReview}%)</label>
                    <input
                        type="range"
                        className="w-full"
                        min="0" max="100"
                        value={weights.peerReview}
                        onChange={(e) => setWeights({ ...weights, peerReview: parseInt(e.target.value) })}
                    />
                </div>

                <div className="pt-4 border-t border-neutral-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 rounded border-neutral-300 focus:ring-blue-500"
                            checked={weights.includeOvertime}
                            onChange={(e) => setWeights({ ...weights, includeOvertime: e.target.checked })}
                        />
                        <span className="text-sm font-medium text-neutral-900">Include verified overtime as a bonus factor</span>
                    </label>
                    <p className="text-xs text-neutral-500 pl-7 mt-1">If enabled, verified overtime hours can boost the score by up to 10%.</p>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                    <Button variant="secondary">Reset to Default</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" icon={<Save className="w-4 h-4" />}>
                        Save Configuration
                    </Button>
                </div>
            </div>
        </div>
    );
}
