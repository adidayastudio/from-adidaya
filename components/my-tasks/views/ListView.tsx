"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

/* ======================
   TYPES
====================== */

type Priority = "Urgent" | "High" | "Medium" | "Low";
type Due = "Overdue" | "Today" | "Tomorrow" | "This Week" | "Next Week" | string;

type Status =
  | "Not Started"
  | "In Progress"
  | "On Hold"
  | "For Review"
  | "Waiting Approval"
  | "Completed";

type Subtask = { id: string; label: string; done: boolean };

/* ======================
   PAGE
====================== */

export default function ListView() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-2 space-y-4">
      <TaskCard
        title="Update Layout Gym Lantai 2"
        project="Precision Gym"
        stage="DD"
        priority="High"
        due="Today"
        initialStatus={null}
        defaultExpanded={true}
        subtasks={[
          { id: "s1", label: "Revisi zoning alat", done: true },
          { id: "s2", label: "Update layout kardio", done: true },
          { id: "s3", label: "Koordinasi kapasitas struktur", done: true },
          { id: "s4", label: "Export PDF", done: true },
          { id: "s5", label: "Upload ke Drive", done: true },
          { id: "s6", label: "Notify team", done: false },
        ]}
      />

      <TaskCard
        title="Upload Minutes of Meeting"
        project="Padel JPF"
        stage="ED"
        priority="Medium"
        due="Tomorrow"
        initialStatus={null}
        defaultExpanded={false}
        subtasks={[
          { id: "m1", label: "Rapihin catatan", done: false },
          { id: "m2", label: "Export PDF", done: false },
        ]}
      />

      <TaskCard
        title="Review Struktur Atap"
        project="Rumah Tinggal X"
        stage="TD"
        priority="Urgent"
        due="Overdue"
        initialStatus="For Review"
        defaultExpanded={true}
        subtasks={[
          { id: "r1", label: "Cek bentang & profil", done: true },
          { id: "r2", label: "Approval final", done: true },
        ]}
      />
    </div>
  );
}

/* ======================
   TASK CARD
====================== */

function TaskCard({
  title,
  project,
  stage,
  priority,
  due,
  subtasks,
  initialStatus,
  defaultExpanded,
}: {
  title: string;
  project: string;
  stage: string;
  priority: Priority;
  due: Due;
  subtasks: Subtask[];
  initialStatus: Status | null; // null = pure auto
  defaultExpanded?: boolean;
}) {
  const [taskTitle, setTaskTitle] = useState(title);
  const [editingTitle, setEditingTitle] = useState(false);

  const [items, setItems] = useState<Subtask[]>(subtasks);
  const [expanded, setExpanded] = useState(defaultExpanded ?? true);

  // manual status override (nullable)
  const [manualStatus, setManualStatus] = useState<Status | null>(initialStatus);

  const total = items.length;
  const doneCount = useMemo(() => items.filter((x) => x.done).length, [items]);
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const autoStatus: Status =
    doneCount === 0 ? "Not Started" : doneCount < total ? "In Progress" : "Completed";

  // effective status
  const status: Status = manualStatus ?? autoStatus;

  // is completed visual state
  const isCompleted = status === "Completed";

  // When subtasks change, keep manualStatus sensible:
  // - If user previously set Completed but then unchecks something => drop manualStatus and follow auto
  useEffect(() => {
    if (manualStatus === "Completed" && doneCount < total) {
      setManualStatus(null);
    }
    // If manualStatus is Not Started but user checks something => drop manualStatus
    if (manualStatus === "Not Started" && doneCount > 0) {
      setManualStatus(null);
    }
  }, [doneCount, total, manualStatus]);

  function toggleSubtask(id: string) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it))
    );
    // any direct subtask interaction returns to auto mode
    setManualStatus(null);
  }

  function setAllSubtasksDone(done: boolean) {
    setItems((prev) => prev.map((it) => ({ ...it, done })));
  }

  function handleStatusChange(next: Status) {
    // Manual override applied
    setManualStatus(next);

    // Special sync behavior:
    if (next === "Completed") {
      setAllSubtasksDone(true); // auto check all
      return;
    }

    if (next === "Not Started") {
      setAllSubtasksDone(false); // reset all
      return;
    }

    // For other manual statuses (In Progress / On Hold / For Review / Waiting Approval)
    // keep checklist as-is; user can adjust subtasks and it will fall back to auto.
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:shadow transition">
      {/* HEADER ROW */}
      <div className="flex items-center gap-4">
        {/* LEFT: title & meta */}
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditingTitle(false);
                if (e.key === "Escape") {
                  setTaskTitle(title);
                  setEditingTitle(false);
                }
              }}
              autoFocus
              className="w-full text-sm font-semibold text-neutral-900 outline-none border-b border-neutral-300 focus:border-brand-red"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className={clsx(
                "text-left w-full text-sm font-semibold truncate",
                isCompleted ? "text-neutral-400 line-through" : "text-neutral-900"
              )}
              title="Click to edit"
            >
              {taskTitle}
            </button>
          )}

          <p className="mt-1 text-xs text-neutral-500">
            {project} · {stage}
          </p>
        </div>

        {/* CENTER: progress */}
        <div className="hidden md:block w-72">
          <ProgressBar
            value={pct}
            rightText={`${doneCount}/${total}`}
            dimmed={isCompleted}
          />
        </div>

        {/* RIGHT: pills + status */}
        <div className="flex items-center gap-2 shrink-0">
          <Pill kind="priority" value={priority} />
          <Pill kind="due" value={due} />
          <StatusDropdown value={status} onChange={handleStatusChange} />
        </div>
      </div>

      {/* MOBILE PROGRESS */}
      <div className="mt-3 md:hidden">
        <ProgressBar value={pct} rightText={`${doneCount}/${total}`} dimmed={isCompleted} />
      </div>

      {/* SUBTASK TOGGLE */}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded((s) => !s)}
          className="text-xs text-neutral-500 hover:text-neutral-700 hover:underline"
        >
          {expanded ? "Hide" : "Show"} subtasks ({total})
        </button>

        {/* (Optional future) bulk-select checkbox for bulk action */}
        {/* <input type="checkbox" /> */}
      </div>

      {/* SUBTASKS */}
      {expanded && (
        <div className="mt-2 space-y-1">
          {items.map((it) => (
            <label
              key={it.id}
              className="flex items-center gap-2 text-xs cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={it.done}
                onChange={() => toggleSubtask(it.id)}
              />
              <span className={clsx(it.done && "line-through text-neutral-400")}>
                {it.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ======================
   PROGRESS BAR
====================== */

function ProgressBar({
  value,
  rightText,
  dimmed,
}: {
  value: number; // 0..100
  rightText?: string;
  dimmed?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={clsx("h-2 flex-1 rounded-full", dimmed ? "bg-neutral-200" : "bg-neutral-200")}>
        <div
          className={clsx("h-2 rounded-full transition-all", dimmed ? "bg-brand-red" : "bg-brand-red")}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      {rightText && <span className="text-xs text-neutral-500">{rightText}</span>}
    </div>
  );
}

/* ======================
   PILL
====================== */

function Pill({
  kind,
  value,
}: {
  kind: "priority" | "due";
  value: string;
}) {
  const cls =
    kind === "priority" ? priorityPillStyle(value) : duePillStyle(value);

  return (
    <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", cls)}>
      {value}
    </span>
  );
}

function priorityPillStyle(priority: string) {
  const map: Record<string, string> = {
    Urgent: "bg-brand-red/10 text-brand-red border border-brand-red/20",
    High: "bg-orange-100 text-orange-700 border border-orange-200",
    Medium: "bg-neutral-100 text-neutral-700 border border-neutral-200",
    Low: "bg-neutral-50 text-neutral-500 border border-neutral-200",
  };
  return map[priority] ?? "bg-neutral-100 text-neutral-600 border border-neutral-200";
}

function duePillStyle(due: string) {
  if (due === "Overdue") return "bg-brand-red/10 text-brand-red border border-brand-red/20";
  if (due === "Today") return "bg-orange-100 text-orange-700 border border-orange-200";
  if (due === "Tomorrow") return "bg-neutral-100 text-neutral-700 border border-neutral-200";
  return "bg-neutral-50 text-neutral-600 border border-neutral-200";
}

/* ======================
   STATUS DROPDOWN (CUSTOM)
====================== */

function StatusDropdown({
  value,
  onChange,
}: {
  value: Status;
  onChange: (v: Status) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const options: Status[] = useMemo(
    () => [
      "Not Started",
      "In Progress",
      "On Hold",
      "For Review",
      "Waiting Approval",
      "Completed",
    ],
    []
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      const t = e.target as Node;
      if (!ref.current.contains(t)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={clsx(
          "inline-flex items-center gap-2 rounded-full border px-3 py-0.5 text-xs font-medium outline-none transition",
          "hover:bg-neutral-50",
          statusPillStyle(value)
        )}
      >
        <span className="inline-flex items-center gap-2">
          <span className={clsx("h-1.5 w-1.5 rounded-full", statusDotStyle(value))} />
          {value}
        </span>
        <span className="text-neutral-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden">
          {options.map((opt) => {
            const active = opt === value;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={clsx(
                  "w-full px-3 py-2 text-left text-xs flex items-center justify-between",
                  "hover:bg-neutral-50",
                  active && "bg-neutral-50 font-semibold text-brand-red"
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <span className={clsx("h-1.5 w-1.5 rounded-full", statusDotStyle(opt))} />
                  {opt}
                </span>
                {active ? <span className="text-brand-red">✓</span> : <span className="text-transparent">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function statusPillStyle(status: Status) {
  return {
    "Not Started": "border-neutral-200 text-neutral-700 bg-white",
    "In Progress": "border-blue-200 text-blue-700 bg-blue-50",
    "On Hold": "border-orange-200 text-orange-700 bg-orange-50",
    "For Review": "border-yellow-200 text-yellow-800 bg-yellow-50",
    "Waiting Approval": "border-purple-200 text-purple-700 bg-purple-50",
    Completed: "border-green-200 text-green-700 bg-green-50",
  }[status];
}

function statusDotStyle(status: Status) {
  return {
    "Not Started": "bg-neutral-400",
    "In Progress": "bg-blue-500",
    "On Hold": "bg-orange-500",
    "For Review": "bg-yellow-500",
    "Waiting Approval": "bg-purple-500",
    Completed: "bg-green-500",
  }[status];
}
