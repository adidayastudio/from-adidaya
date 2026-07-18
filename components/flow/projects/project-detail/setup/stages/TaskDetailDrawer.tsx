"use client";

import { X, Calendar, User, CornerDownRight, ChevronRight } from "lucide-react";
import { Task } from "./types";
import { TaskInputRenderer } from "./TaskInputRenderer";

type TaskDetailDrawerProps = {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    onUpdate: (id: string, field: keyof Task, value: any) => void;
};

const PRIORITY_OPTIONS = [
    { label: "Low", value: "low" },
    { label: "Medium", value: "medium" },
    { label: "High", value: "high" },
    { label: "Urgent", value: "urgent" },
];

export default function TaskDetailDrawer({
    isOpen,
    onClose,
    task,
    onUpdate
}: TaskDetailDrawerProps) {
    if (!task) return null;

    const isSubtask = task.code.split("-").length > 2;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/10 backdrop-blur-[2px] transition-all duration-500 z-[90] ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={onClose}
            />
 
            {/* Right Side Floating Glass Drawer */}
            <div className={`fixed top-2 bottom-2 right-2 w-[calc(100%-16px)] sm:w-[480px] bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-white/40 rounded-[48px] shadow-2xl z-[100] transition-all duration-500 overflow-hidden flex flex-col ${isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}>
 
                {/* Subtle Blue Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-400/15 blur-[100px] pointer-events-none" />
 
                {/* Drag Handle Indicator */}
                <div className="flex-shrink-0 pt-3 flex justify-center relative z-10">
                    <div className="w-10 h-1.5 rounded-full bg-neutral-200/50" />
                </div>
 
                {/* HEADER */}
                <div className="flex items-center justify-between px-8 py-6 relative z-10 flex-shrink-0">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-blue-500 bg-blue-50/50 border border-blue-100 px-2 py-0.5 rounded-full shadow-sm tracking-wider">
                                {task.code}
                            </span>
                            {isSubtask && (
                                <span className="flex items-center gap-1 text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
                                    <CornerDownRight className="w-3.5 h-3.5" /> Subtask
                                </span>
                            )}
                        </div>
                        <h3 className="text-[22px] font-bold text-neutral-900 tracking-tight mt-1">
                            Task Setup
                        </h3>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-xl border border-black/5 flex items-center justify-center text-neutral-400 hover:text-neutral-900 active:scale-95 transition-all shadow-sm">
                        <X size={20} strokeWidth={1.5} />
                    </button>
                </div>
 
                {/* SCROLLABLE BODY */}
                <div className="flex-1 overflow-y-auto px-8 py-2 pb-8 space-y-8 relative z-10">
 
                    {/* MAIN INFO (Editable) */}
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2 block mb-1.5">Task Name</label>
                            <input
                                value={task.name}
                                onChange={(e) => onUpdate(task.id, "name", e.target.value)}
                                placeholder="Enter task name..."
                                className="w-full bg-white/40 backdrop-blur-md border border-black/5 rounded-full h-11 text-[14px] font-medium text-neutral-800 px-5 focus:bg-white focus:border-blue-200 transition-all shadow-sm shadow-black/[0.02] placeholder:text-neutral-300 font-sans"
                            />
                        </div>
 
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2 block mb-1.5">Assignee</label>
                                <div className="relative">
                                    <input
                                        value={task.assignee || ""}
                                        onChange={(e) => onUpdate(task.id, "assignee", e.target.value)}
                                        placeholder="Unassigned"
                                        className="w-full bg-white/40 backdrop-blur-md border border-black/5 rounded-full h-11 text-[14px] font-medium text-neutral-800 px-5 focus:bg-white focus:border-blue-200 outline-none transition-all shadow-sm font-sans"
                                    />
                                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2 block mb-1.5">Deadline</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={task.deadline || ""}
                                        onChange={(e) => onUpdate(task.id, "deadline", e.target.value)}
                                        className="w-full bg-white/40 backdrop-blur-md border border-black/5 rounded-full h-11 text-[14px] font-medium text-neutral-800 px-5 focus:bg-white focus:border-blue-200 outline-none transition-all shadow-sm font-sans"
                                    />
                                </div>
                            </div>
                        </div>
 
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2 block mb-1.5">Priority</label>
                                <div className="relative w-full">
                                    <select
                                        value={task.priority}
                                        onChange={(e) => onUpdate(task.id, "priority", e.target.value)}
                                        className="w-full bg-white/40 backdrop-blur-md border border-black/5 rounded-full h-11 text-[13px] font-bold text-neutral-800 px-5 appearance-none cursor-pointer outline-none focus:bg-white focus:border-blue-200 transition-all font-sans"
                                    >
                                        {PRIORITY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value} className="text-neutral-900 bg-white dark:text-white dark:bg-neutral-900">{opt.label}</option>
                                        ))}
                                    </select>
                                    <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 rotate-90" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2 block mb-1.5">Weight (%)</label>
                                <input
                                    type="number"
                                    value={task.weight || ""}
                                    onChange={(e) => onUpdate(task.id, "weight", parseFloat(e.target.value))}
                                    placeholder="0"
                                    className="w-full bg-white/40 backdrop-blur-md border border-black/5 rounded-full h-11 text-[14px] font-medium text-neutral-800 px-5 focus:bg-white focus:border-blue-200 outline-none transition-all shadow-sm font-sans"
                                />
                            </div>
                        </div>
                    </div>
 
                    <div className="h-px bg-black/[0.03] -mx-8" />
 
                    {/* DYNAMIC INPUT RENDERER */}
                    <div className="px-2">
                        <TaskInputRenderer
                            task={task}
                            onUpdateData={(newData) => onUpdate(task.id, "inputData", newData)}
                        />
                    </div>
                </div>
 
                {/* FOOTER */}
                <div className="px-8 pb-10 pt-4 flex flex-col gap-3 relative z-10 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full bg-neutral-900 text-white h-[64px] rounded-full font-bold text-[17px] active:scale-[0.98] transition-all shadow-xl shadow-black/10 border border-white/10"
                    >
                        Save & Close
                    </button>
                </div>
            </div>
        </>
    );
}
