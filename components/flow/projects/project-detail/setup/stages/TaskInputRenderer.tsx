"use client";

import React, { useMemo } from "react";
import { Task, DetailSchemaType } from "./types";
import { Input } from "@/shared/ui/primitives/input/input";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import { Calendar, UploadCloud, FileText, Info, AlertTriangle } from "lucide-react";

interface TaskInputRendererProps {
    task: Task;
    onUpdateData: (newData: any) => void;
}

export const TaskInputRenderer: React.FC<TaskInputRendererProps> = ({ task, onUpdateData }) => {
    // 1. Schema-Driven Resolution
    // If schemaType is missing, fallback to DESCRIPTION_ONLY (Safe default)
    const schemaType: DetailSchemaType = task.schemaType || "DESCRIPTION_ONLY";
    const { inputConfig = {}, inputData = {} } = task;

    // Helper to update specific field
    const updateField = (field: string, value: any) => {
        const updated = { ...inputData, [field]: value };

        // Auto-Calculation for Date Range
        if (schemaType === "DATE_RANGE_WITH_DURATION" && (field === "startDate" || field === "endDate")) {
            const start = field === "startDate" ? value : inputData.startDate;
            const end = field === "endDate" ? value : inputData.endDate;
            if (start && end) {
                const diff = new Date(end).getTime() - new Date(start).getTime();
                const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                updated.duration = days > 0 ? days : 0;
            } else {
                updated.duration = 0;
            }
        }
        onUpdateData(updated);
    };

    // Shared UI: Textarea (Mimicking Input primitive style for consistency)
    const renderTextarea = (field: string, placeholder: string, label?: string) => (
        <div className="space-y-1">
            {label && <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{label}</label>}
            <textarea
                className="w-full h-24 p-3 text-sm border border-neutral-200 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all resize-none bg-white placeholder-neutral-400"
                placeholder={placeholder}
                value={inputData[field] || ""}
                onChange={(e) => updateField(field, e.target.value)}
            />
        </div>
    );

    /* ======================================================
       SCHEMA REFERENCE IMPLEMENTATION
    ====================================================== */

    switch (schemaType) {

        // 1. DESCRIPTION ONLY
        // Field: description
        case "DESCRIPTION_ONLY":
            return (
                <div className="space-y-4">
                    {renderTextarea("description", "Enter task description / details...", "Description")}
                </div>
            );

        // 2. DELIVERABLE BASIC
        // Fields: files[], description
        case "DELIVERABLE_BASIC":
            return (
                <div className="space-y-4">
                    <div className="space-y-3 p-4 bg-purple-50/50 rounded-lg border border-purple-100 border-dashed">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-1.5 bg-purple-100 text-purple-600 rounded">
                                <UploadCloud className="w-4 h-4" />
                            </span>
                            <h4 className="text-xs font-bold text-purple-900 uppercase">Deliverables Header</h4>
                        </div>

                        {/* Mock Upload UI - In real app, this would be a Dropzone */}
                        <div className="border border-dashed border-purple-200 rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-white hover:bg-purple-50 transition-colors cursor-pointer group">
                            <UploadCloud className="w-8 h-8 text-neutral-300 group-hover:text-purple-500 transition-colors" />
                            <p className="text-xs text-neutral-500 font-medium">Click or Drag files here</p>
                            <span className="text-[10px] text-neutral-400">
                                Allowed: {inputConfig?.allowedExtensions?.join(", ") || "All files"}
                            </span>
                        </div>
                    </div>
                    {renderTextarea("description", "Describe the deliverable...", "Notes")}
                </div>
            );

        // 3. NUMERIC SINGLE
        // Fields: value
        case "NUMERIC_SINGLE":
            return (
                <div className="space-y-4">
                    <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                        <Input
                            label="Value"
                            type="number"
                            placeholder="0"
                            value={inputData.value || ""}
                            onChange={(e) => updateField("value", parseFloat(e.target.value))}
                            iconLeft={<FileText className="w-4 h-4" />}
                        />
                    </div>
                </div>
            );

        // 4. NUMERIC RANGE
        // Fields: min, max
        case "NUMERIC_RANGE":
            return (
                <div className="space-y-4">
                    <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
                        <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-neutral-700 uppercase">Range</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Minimum"
                                type="number"
                                placeholder="0"
                                value={inputData.min || ""}
                                onChange={(e) => updateField("min", parseFloat(e.target.value))}
                            />
                            <Input
                                label="Maximum"
                                type="number"
                                placeholder="0"
                                value={inputData.max || ""}
                                onChange={(e) => updateField("max", parseFloat(e.target.value))}
                            />
                        </div>
                    </div>
                </div>
            );

        // 5. CURRENCY RANGE
        // Fields: min, max (Currency label)
        case "CURRENCY_RANGE":
            const currency = inputConfig.currency || "IDR";
            return (
                <div className="space-y-4">
                    <div className="p-4 bg-green-50/50 rounded-lg border border-green-100 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1 bg-green-100 text-green-700 rounded"><span className="text-xs font-bold">$</span></div>
                            <h4 className="text-xs font-bold text-green-800 uppercase">Budget ({currency})</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Minimum"
                                type="number"
                                placeholder="0"
                                value={inputData.min || ""}
                                onChange={(e) => updateField("min", parseFloat(e.target.value))}
                            />
                            <Input
                                label="Maximum"
                                type="number"
                                placeholder="0"
                                value={inputData.max || ""}
                                onChange={(e) => updateField("max", parseFloat(e.target.value))}
                            />
                        </div>
                    </div>
                </div>
            );

        // 6. DATE RANGE WITH DURATION
        // Fields: startDate, endDate, duration (auto)
        case "DATE_RANGE_WITH_DURATION":
            const duration = inputData.duration || 0;
            return (
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 space-y-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <h4 className="text-xs font-bold text-blue-800 uppercase">Timeline</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Start Date"
                                type="date"
                                value={inputData.startDate || ""}
                                onChange={(e) => updateField("startDate", e.target.value)}
                            />
                            <Input
                                label="End Date"
                                type="date"
                                value={inputData.endDate || ""}
                                onChange={(e) => updateField("endDate", e.target.value)}
                            />
                        </div>

                        {/* Auto Field */}
                        <div className="flex items-center justify-between p-3 bg-blue-100/50 rounded border border-blue-200">
                            <span className="text-xs font-medium text-blue-700">Duration (Auto)</span>
                            <span className="text-sm font-bold text-blue-900">{duration} Days</span>
                        </div>
                    </div>
                </div>
            );

        // 7. STATUS WITH NOTE
        // Fields: status, note
        case "STATUS_WITH_NOTE":
            const options = inputConfig.options || ["Pending", "In Progress", "Done", "Issues"];
            const selectOptions = options.map(opt => ({ label: opt, value: opt }));

            return (
                <div className="space-y-4">
                    <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</label>
                            <Select
                                value={inputData.status || options[0]}
                                onChange={(val: string) => updateField("status", val)}
                                options={selectOptions}
                            />
                        </div>
                        {renderTextarea("note", "Add status notes...", "Notes")}
                    </div>
                </div>
            );

        default:
            // Fallback for unknown schema types? Or Strict error?
            // Prompt says: "Renderer MUST NOT invent new schema types." 
            // Logic implies invalid schema should default to Description or empty.
            return (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Invalid Schema Type</span>
                </div>
            );
    }
};
