"use client";

import { Info, Calculator } from "lucide-react";

export default function ScoringLogicPanel() {
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <Info className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-blue-900">How Scoring Works</h3>
                        <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                            The Performance Index is a composite score calculated automatically based on the weights defined in the Weighting tab.
                            It serves as a high-level indicator of an employee's contribution and reliability.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-neutral-500" />
                    <h3 className="font-semibold text-neutral-900">Calculation Formula</h3>
                </div>
                <div className="p-6 font-mono text-sm bg-neutral-900 text-green-400 overflow-x-auto">
                    <p>{`Total_Score = `}</p>
                    <p className="pl-4">{`(Attendance_Rate * Weight_A) +`}</p>
                    <p className="pl-4">{`(Task_Completion_Rate * Weight_T) +`}</p>
                    <p className="pl-4">{`(Review_Score * Weight_R) +`}</p>
                    <p className="pl-4">{`Overtime_Bonus`}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-neutral-200 rounded-xl p-6">
                    <h4 className="font-semibold text-neutral-900 mb-3">Metrics Dictionary</h4>
                    <ul className="space-y-3 text-sm text-neutral-600">
                        <li className="flex gap-2">
                            <span className="font-medium text-neutral-900 min-w-[120px]">Attendance Rate:</span>
                            <span>Percentage of workdays clocked in on time vs total scheduled days.</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="font-medium text-neutral-900 min-w-[120px]">Task Completion:</span>
                            <span>Ratio of tasks completed on or before due date.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
