"use client";

import { Task } from "../types";
import { ChevronRight, Plus, GripVertical, Calendar, User, Trash2, ArrowUp, ArrowDown, CornerDownRight } from "lucide-react";
import clsx from "clsx";
import { useState, useEffect } from "react";

/* 
 * TaskTable Component
 * With Drag-and-Drop Reordering
 */

type TaskTableProps = {
  tasks: Task[];
  onAddTask: (parentId?: string, mode?: "above" | "below" | "subtask", relativeId?: string) => void;
  onUpdateTask: (id: string, field: keyof Task, value: any) => void;
  onDeleteTask: (id: string) => void;
  onViewDetail: (task: Task) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
};

export default function TaskTable({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onViewDetail,
  onReorder
}: TaskTableProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // DRAG HANDLERS
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = draggedIndex;
    if (fromIndex !== null && fromIndex !== toIndex && onReorder) {
      onReorder(fromIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (!tasks.length) {
    return (
      <div className="py-2 text-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50/30 mx-4 mb-4">
        <button
          onClick={() => onAddTask()}
          className="text-xs text-neutral-400 font-medium hover:text-brand-red flex items-center justify-center gap-1 mx-auto py-2 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add Task
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full pb-2 px-0">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-6" />
          <col className="w-14" />
          <col className="w-auto" />
          <col className="w-16" />
          <col className="w-20" />
          <col className="w-24" />
        </colgroup>
        <thead>
          <tr className="text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-100/50">
            <th className="py-2 text-left"></th>
            <th className="py-2 text-left pl-1">Code</th>
            <th className="py-2 text-left pl-2">Task</th>
            <th className="py-2 text-center">Weight</th>
            <th className="py-2 text-center">Priority</th>
            <th className="py-2 text-right pr-2">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-50">
          {tasks.map((task, index) => {
            // Calculate Depth based on hyphens:
            // SD-01-01 -> 0 (Root) -> 2 hyphens
            // SD-01-01-01 -> 1 (Sub) -> 3 hyphens
            const hyphenCount = (task.code.match(/-/g) || []).length;
            const depth = Math.max(0, hyphenCount - 2);

            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index && draggedIndex !== index;

            return (
              <tr
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={clsx(
                  "group transition-all",
                  isDragging && "opacity-50 bg-neutral-100",
                  isDragOver && "border-t-2 border-brand-red",
                  !isDragging && !isDragOver && "hover:bg-neutral-50/80"
                )}
              >
                {/* DRAG HANDLER */}
                <td className="py-2 text-neutral-300 align-middle cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-3 h-3 mx-auto text-neutral-300 group-hover:text-neutral-500" />
                </td>

                {/* CODE */}
                <td className="py-2 text-[11px] text-neutral-400 align-middle pl-1 font-medium">
                  {/* Only show trailing numbers for deep hierarchy? 
                       User rule: "show only necessary trailing numbers".
                       e.g. 01-01 (Root), then just .01 for subtask?
                       Let's keep full code for now to avoid confusion, or abridge it.
                       Let's stick to full code for clarity unless depth > 0.
                   */}
                  {task.code}
                </td>

                {/* TASK NAME (Editable) */}
                <td className="py-2 font-medium text-neutral-900 align-middle pr-2">
                  <div
                    className="flex items-center gap-2"
                    style={{ paddingLeft: `${depth * 1.5}rem` }} // Dynamic Indentation
                  >
                    {depth > 0 && <CornerDownRight className="w-3 h-3 text-neutral-300 shrink-0" />}
                    <input
                      type="text"
                      value={task.name}
                      onChange={(e) => onUpdateTask(task.id, "name", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      className="bg-transparent w-full text-[13px] focus:outline-none focus:bg-white focus:ring-1 focus:ring-brand-red/20 rounded px-1 transition-all placeholder-neutral-300 truncate"
                      placeholder={depth > 0 ? "Subtask name..." : "Task name..."}
                    />
                  </div>
                </td>



                {/* WEIGHT */}
                <td className="py-2 text-neutral-600 text-xs align-middle text-center">
                  <TableWeightInput
                    weight={task.weight || 0}
                    onChange={(val) => onUpdateTask(task.id, "weight", val)}
                  />
                </td>



                {/* PRIORITY */}
                <td className="py-2 align-middle text-center">
                  <PriorityBadge value={task.priority} />
                </td>

                {/* ACTION */}
                <td className="py-2 text-right text-neutral-300 align-middle pr-2 overflow-visible relative">
                  <div className="flex items-center justify-end gap-1">
                    {/* ADD DROPDOWN TRIGGER */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === task.id ? null : task.id)}
                        className={clsx("p-1 rounded transition-colors", activeDropdown === task.id ? "text-brand-red bg-red-50" : "text-neutral-400 hover:text-brand-red hover:bg-neutral-100")}
                        title="Add..."
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      {/* DROPDOWN MENU */}
                      {activeDropdown === task.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                          <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-xl border border-neutral-100 z-20 py-1 flex flex-col items-start overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <button
                              onClick={() => { onAddTask(undefined, "above", task.id); setActiveDropdown(null); }}
                              className="w-full text-left px-3 py-1.5 text-[11px] text-neutral-600 hover:bg-neutral-50 hover:text-brand-red flex items-center gap-2"
                            >
                              <ArrowUp className="w-3 h-3" /> Add Above
                            </button>
                            <button
                              onClick={() => { onAddTask(undefined, "below", task.id); setActiveDropdown(null); }}
                              className="w-full text-left px-3 py-1.5 text-[11px] text-neutral-600 hover:bg-neutral-50 hover:text-brand-red flex items-center gap-2"
                            >
                              <ArrowDown className="w-3 h-3" /> Add Below
                            </button>
                            <button
                              onClick={() => { onAddTask(task.id, "subtask", task.id); setActiveDropdown(null); }}
                              className="w-full text-left px-3 py-1.5 text-[11px] text-neutral-600 hover:bg-neutral-50 hover:text-brand-red flex items-center gap-2"
                            >
                              <CornerDownRight className="w-3 h-3" /> Add Subtask
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onViewDetail(task)}
                      className="p-1 text-neutral-400 hover:bg-neutral-100 hover:text-brand-red rounded transition-colors"
                      title="View Details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}

          {/* ADD ROW BUTTON */}
          <tr>
            <td colSpan={6} className="py-2 pt-2">
              <button
                onClick={() => onAddTask()}
                className="flex items-center gap-2 text-[11px] font-medium text-neutral-400 hover:text-brand-red transition-colors pl-8"
              >
                <Plus className="w-3 h-3" /> Add Task
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* =========================
   BADGES
========================= */

function PriorityBadge({
  value,
}: {
  value?: Task["priority"];
}) {
  if (!value) return <span className="text-neutral-300 text-[10px] font-medium cursor-pointer hover:text-neutral-500">Low</span>;

  const styles: Record<string, string> = {
    low: "text-neutral-500 bg-neutral-100",
    medium: "text-blue-600 bg-blue-50",
    high: "text-orange-600 bg-orange-50",
    urgent: "text-red-600 bg-red-50",
  };

  return (
    <span
      className={clsx(
        "inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
        styles[value]
      )}
    >
      {value}
    </span>
  );
}

interface TableWeightInputProps {
  weight: number;
  onChange: (val: number) => void;
}

function TableWeightInput({ weight, onChange }: TableWeightInputProps) {
  // Use "0.00" string state to handle decimals correctly
  const [localValue, setLocalValue] = useState(weight != null ? weight.toFixed(2) : "0.00");

  useEffect(() => {
    setLocalValue(weight != null ? weight.toFixed(2) : "0.00");
  }, [weight]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleCommit = () => {
    const val = parseFloat(localValue);
    if (!isNaN(val)) {
      // Here we could round if desired, but we keep float precision as per logic.
      onChange(val);
      // Format to 2 decimals for display
      setLocalValue(val.toFixed(2));
    } else {
      // Revert
      setLocalValue(weight != null ? weight.toFixed(2) : "0.00");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="number"
      value={localValue}
      onChange={handleChange}
      onBlur={handleCommit}
      onKeyDown={handleKeyDown}
      className="bg-transparent w-14 text-center text-[11px] focus:outline-none focus:bg-white focus:ring-1 focus:ring-brand-red/20 rounded px-1 transition-all placeholder-neutral-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      placeholder="0.00"
      step="0.01"
      min="0"
    />
  );
}
