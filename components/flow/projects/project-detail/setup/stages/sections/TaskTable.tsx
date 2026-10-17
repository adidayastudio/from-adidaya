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
    <div className="relative w-full pb-2 px-0 overflow-visible">
      <table className="w-full text-sm table-fixed border-collapse">
        <colgroup>
          <col className="w-8" />
          <col className="w-20" />
          <col className="w-[38%]" />
          <col className="w-[38%]" />
          <col className="w-20" />
          <col className="w-24" />
          <col className="w-20" />
        </colgroup>
        <thead>
          <tr className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 bg-neutral-100/60 dark:bg-neutral-800/40 rounded-lg">
            <th className="py-2.5 text-left pl-2 rounded-l-lg"></th>
            <th className="py-2.5 text-left pl-2">Code</th>
            <th className="py-2.5 text-left pl-3">Task (EN)</th>
            <th className="py-2.5 text-left pl-3">Task (ID)</th>
            <th className="py-2.5 text-center">Weight</th>
            <th className="py-2.5 text-center">Priority</th>
            <th className="py-2.5 text-right pr-4 rounded-r-lg">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-100/60 dark:divide-neutral-800/40">
          {tasks.map((task, index) => {
            const hyphenCount = (task.code.match(/-/g) || []).length;
            const depth = Math.max(0, hyphenCount - 2);

            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index && draggedIndex !== index;

            // Short code format: strip stage prefix like KO-, SD-, etc.
            const displayCode = task.code.replace(/^[A-Z]{2}-/, "");

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
                  isDragging && "opacity-50 bg-neutral-100 dark:bg-neutral-800",
                  isDragOver && "border-t-2 border-brand-red",
                  !isDragging && !isDragOver && "hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40"
                )}
              >
                {/* DRAG HANDLER */}
                <td className="py-2 text-neutral-300 align-middle cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-3 h-3 mx-auto text-neutral-300 group-hover:text-neutral-500" />
                </td>

                {/* CODE */}
                <td className="py-3 text-[11px] text-neutral-400 dark:text-neutral-500 align-middle pl-2 font-medium whitespace-nowrap">
                  {displayCode}
                </td>

                {/* TASK NAME EN */}
                <td className="py-3 font-medium text-neutral-900 dark:text-white align-middle pl-3 pr-3">
                  <div
                    className="flex items-center gap-2"
                    style={{ paddingLeft: `${depth * 1.2}rem` }}
                  >
                    {depth > 0 && <CornerDownRight className="w-3 h-3 text-neutral-300 shrink-0" />}
                    <input
                      type="text"
                      value={task.name || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateTask(task.id, "name", val);

                        // Smart Auto-Associate with Master Template Library
                        const normalizedInput = val.trim().toLowerCase();
                        if (normalizedInput.length >= 3) {
                          const masterMatch = [
                            // KO
                            { en: "Cover", id: "Sampul", weight: 4, priority: "low" },
                            { en: "Table of Contents", id: "Daftar Isi", weight: 4, priority: "low" },
                            { en: "Purpose of Kickoff", id: "Tujuan KO", weight: 8, priority: "medium" },
                            { en: "Kickoff Scope & Deliverables", id: "Ruang Lingkup dan Keluaran KO", weight: 10, priority: "high" },
                            { en: "Workflow Overview", id: "Tinjauan Alur Kerja", weight: 4, priority: "low" },
                            { en: "Project Understanding", id: "Pemahaman Proyek", weight: 24, priority: "high" },
                            { en: "Client Needs & Vision", id: "Visi & Kebutuhan Klien", weight: 42, priority: "high" },
                            { en: "Functional Requirements", id: "Kebutuhan Fungsional", weight: 24, priority: "high" },
                            { en: "Budget Expectation", id: "Ekspektasi Anggaran", weight: 15, priority: "medium" },
                            { en: "Timeline Expectation", id: "Ekspektasi Lini Waktu", weight: 15, priority: "medium" },
                            { en: "Design Scope", id: "Lingkup Desain", weight: 40, priority: "high" },
                            { en: "Construction Scope", id: "Lingkup Konstruksi", weight: 40, priority: "high" },
                            { en: "Exclusions & Assumptions", id: "Pengecualian & Asumsi", weight: 20, priority: "medium" },
                            { en: "Site Photos and Videos", id: "Foto dan Video Tapak", weight: 32, priority: "high" },
                            { en: "Existing Drawings", id: "Gambar Kerja Eksisting", weight: 16, priority: "medium" },
                            { en: "Measurement & Verification", id: "Pengukuran & Verifikasi", weight: 32, priority: "high" },
                            // SD
                            { en: "Purpose of SD", id: "Tujuan Desain Skematik", weight: 10, priority: "medium" },
                            { en: "SD Scope & Deliverables", id: "Lingkup & Keluaran Desain Skematik", weight: 13, priority: "high" },
                            { en: "Room List", id: "Daftar Ruang", weight: 30, priority: "high" },
                            { en: "Area Calculation", id: "Perhitungan Luas Ruang", weight: 30, priority: "high" },
                            { en: "Zoning Diagram", id: "Diagram Zonasi Ruang", weight: 40, priority: "high" },
                            { en: "Initial Massing", id: "Studi Gubahan Awal", weight: 38, priority: "high" },
                            { en: "Alternative Massing", id: "Alternatif Gubahan", weight: 37, priority: "medium" },
                            { en: "Selected Massing", id: "Gubahan Terpilih", weight: 50, priority: "high" },
                            // DD
                            { en: "Architectural Drawing Set", id: "Set Gambar Arsitektur", weight: 100, priority: "high" },
                            { en: "Structural Concept", id: "Konsep Struktur", weight: 80, priority: "high" },
                            { en: "MEP Concept", id: "Konsep MEP", weight: 80, priority: "high" },
                            { en: "Material Specs Sheet", id: "Lembar Spesifikasi Material", weight: 60, priority: "medium" },
                            // ED
                            { en: "For-Construction Drawings", id: "Gambar Kerja Konstruksi (FOR-CON)", weight: 250, priority: "urgent" },
                            { en: "Bill of Quantities (BQ)", id: "Rincian Volume Pekerjaan (BQ)", weight: 150, priority: "high" },
                            { en: "Technical Specifications", id: "Spesifikasi Teknis Lengkap", weight: 100, priority: "high" },
                            // PC / CN / HO
                            { en: "Tender & Procurement", id: "Tender & Pengadaan", weight: 100, priority: "high" },
                            { en: "Site Execution & Supervision", id: "Pelaksanaan & Pengawasan Lapangan", weight: 300, priority: "urgent" },
                            { en: "Handover & Defect Liability", id: "Serah Terima & Masa Pemeliharaan", weight: 100, priority: "high" }
                          ].find((m) => m.en.toLowerCase() === normalizedInput);

                          if (masterMatch) {
                            onUpdateTask(task.id, "nameId", masterMatch.id);
                            if (!task.weight) onUpdateTask(task.id, "weight", masterMatch.weight);
                            if (!task.priority) onUpdateTask(task.id, "priority", masterMatch.priority);
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      className="bg-transparent w-full text-[13px] focus:outline-none focus:bg-white dark:focus:bg-neutral-800 focus:ring-1 focus:ring-brand-red/20 rounded-md px-2 py-0.5 transition-all placeholder-neutral-300 truncate font-semibold"
                      placeholder={depth > 0 ? "Subtask (EN)..." : "Task name (EN)..."}
                    />
                  </div>
                </td>

                {/* TASK NAME ID */}
                <td className="py-3 font-medium text-neutral-900 dark:text-white align-middle pl-3 pr-3">
                  <input
                    type="text"
                    value={task.nameId || ""}
                    onChange={(e) => onUpdateTask(task.id, "nameId", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className="bg-transparent w-full text-[13px] italic text-neutral-600 dark:text-neutral-400 focus:outline-none focus:bg-white dark:focus:bg-neutral-800 focus:ring-1 focus:ring-brand-red/20 rounded-md px-2 py-0.5 transition-all placeholder-neutral-300 truncate"
                    placeholder="Nama task (ID)..."
                  />
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
                  <PriorityDropdown
                    value={task.priority}
                    onChange={(val) => onUpdateTask(task.id, "priority", val)}
                  />
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
                  </div>
                </td>
              </tr>
            );
          })}

          {/* ADD ROW BUTTON */}
          <tr>
            <td colSpan={7} className="py-2 pt-2">
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
   PRIORITY DROPDOWN
========================= */

const PRIORITY_OPTIONS: { value: Task["priority"]; label: string; dot: string; bg: string; text: string; hoverBg: string }[] = [
  { value: "low",    label: "Low",    dot: "bg-neutral-400", bg: "bg-neutral-100",  text: "text-neutral-500", hoverBg: "hover:bg-neutral-50" },
  { value: "medium", label: "Medium", dot: "bg-blue-500",    bg: "bg-blue-50",      text: "text-blue-600",    hoverBg: "hover:bg-blue-50/60" },
  { value: "high",   label: "High",   dot: "bg-orange-500",  bg: "bg-orange-50",    text: "text-orange-600",  hoverBg: "hover:bg-orange-50/60" },
  { value: "urgent", label: "Urgent", dot: "bg-red-500",     bg: "bg-red-50",       text: "text-red-600",     hoverBg: "hover:bg-red-50/60" },
];

function PriorityDropdown({
  value,
  onChange,
}: {
  value?: Task["priority"];
  onChange: (val: Task["priority"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useState<HTMLButtonElement | null>(null);
  const [buttonElem, setButtonElem] = useState<HTMLButtonElement | null>(null);
  const current = PRIORITY_OPTIONS.find((o) => o.value === value) || PRIORITY_OPTIONS[0];

  return (
    <div className="relative inline-block">
      {/* TRIGGER BADGE */}
      <button
        ref={(el) => setButtonElem(el)}
        onClick={() => setOpen(!open)}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold uppercase cursor-pointer transition-all",
          current.bg, current.text,
          "hover:ring-1 hover:ring-current/20 hover:shadow-sm"
        )}
      >
        <span className={clsx("w-1.5 h-1.5 rounded-full", current.dot)} />
        {current.label}
        <svg className={clsx("w-2.5 h-2.5 opacity-50 transition-transform", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* DROPDOWN MENU - FLOATING OVERLAY */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed -translate-x-1/2 mt-1 w-28 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-100 dark:border-neutral-800 z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: `${buttonElem?.getBoundingClientRect().bottom || 0}px`,
              left: `${(buttonElem?.getBoundingClientRect().left || 0) + (buttonElem?.getBoundingClientRect().width || 0) / 2}px`
            }}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={clsx(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase transition-colors",
                  opt.text, opt.hoverBg,
                  value === opt.value && clsx(opt.bg, "font-extrabold")
                )}
              >
                <span className={clsx("w-2 h-2 rounded-full shrink-0", opt.dot)} />
                {opt.label}
                {value === opt.value && (
                  <svg className="w-3 h-3 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
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
