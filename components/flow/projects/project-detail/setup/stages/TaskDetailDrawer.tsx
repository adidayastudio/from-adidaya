"use client";

import { X, Calendar, User, CornerDownRight } from "lucide-react";
import { Task } from "./types";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";

type TaskDetailDrawerProps = {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    onUpdate: (id: string, field: keyof Task, value: any) => void;
};
import { TaskInputRenderer } from "./TaskInputRenderer";

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
        <div className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
            <div className="h-full flex flex-col">
                {/* HEADER */}
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-neutral-500 bg-white border border-neutral-200 px-1.5 py-0.5 rounded shadow-sm">
                            {task.code}
                        </span>
                        {isSubtask && (
                            <span className="flex items-center gap-1 text-[9px] text-neutral-400 uppercase font-bold">
                                <CornerDownRight className="w-3 h-3" /> Subtask
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 p-1 rounded-full hover:bg-neutral-200/50 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">

                    {/* MAIN INFO (Editable) */}
                    <div className="space-y-4">
                        <Input
                            label="Task Name"
                            value={task.name}
                            onChange={(e) => onUpdate(task.id, "name", e.target.value)}
                            placeholder="Enter task name..."
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Assignee"
                                value={task.assignee || ""}
                                onChange={(e) => onUpdate(task.id, "assignee", e.target.value)}
                                placeholder="Unassigned"
                                iconRight={<User className="w-4 h-4 text-neutral-400" />}
                            />
                            <Input
                                type="date"
                                label="Deadline"
                                value={task.deadline || ""}
                                onChange={(e) => onUpdate(task.id, "deadline", e.target.value)}
                                iconRight={<Calendar className="w-4 h-4 text-neutral-400" />}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5 pl-0.5">
                                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Priority</label>
                                <Select
                                    value={task.priority}
                                    onChange={(val: string) => onUpdate(task.id, "priority", val)}
                                    options={PRIORITY_OPTIONS}
                                />
                            </div>
                            <Input
                                type="number"
                                label="Weight (%)"
                                value={task.weight || ""}
                                onChange={(e) => onUpdate(task.id, "weight", parseFloat(e.target.value))}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <hr className="border-neutral-100" />

                    {/* DYNAMIC INPUT RENDERER */}
                    <div className="space-y-4">
                        <TaskInputRenderer
                            task={task}
                            onUpdateData={(newData) => onUpdate(task.id, "inputData", newData)}
                        />
                    </div>

                    {/* OPTIONAL: Always show generic description if not simple_text? 
                        User rule: "1 Primary Input Type + Optional Description field for all?"
                        We implemented simple_text as a type. If type is "number_range", do we still want a text description? 
                        Let's stick to the renderer managing it for now.
                     */}
                </div>

                {/* FOOTER */}
                <div className="p-3 border-t border-neutral-100 bg-white flex justify-end">
                    <Button size="sm" onClick={onClose}>Done</Button>
                </div>
            </div>
        </div>
    );
}
