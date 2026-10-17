"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

/* ======================
   TYPES
====================== */

type TaskStatus =
  | "Not Started"
  | "In Progress"
  | "On Hold"
  | "For Review"
  | "Waiting Approval"
  | "Completed";

type Priority = "Urgent" | "High" | "Medium" | "Low";

type TimelineTask = {
  id: string;
  title: string;
  project: string;
  // store as ISO date (YYYY-MM-DD) so multiweek & sync later is easy
  startDate: string;
  endDate: string;
  status: TaskStatus;
  priority?: Priority;
};

/* ======================
   STATUS → BAR STYLE (SOFT)
====================== */

const STATUS_BAR_STYLE: Record<TaskStatus, string> = {
  "Not Started": "bg-neutral-200 text-neutral-800 border-neutral-300",
  "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
  "On Hold": "bg-orange-100 text-orange-800 border-orange-200",
  "For Review": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Waiting Approval": "bg-purple-100 text-purple-800 border-purple-200",
  "Completed": "bg-green-100 text-green-800 border-green-200",
};

/* ======================
   DATE HELPERS
====================== */

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toISODate(d: Date) {
  // local date YYYY-MM-DD
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fromISODate(iso: string) {
  // interpret as local date
  const [y, m, da] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, da ?? 1);
}

function addDaysISO(iso: string, days: number) {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function diffDaysISO(aISO: string, bISO: string) {
  // a - b in days (local midnight)
  const a = fromISODate(aISO);
  const b = fromISODate(bISO);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun..6=Sat
  const mondayOffset = (day + 6) % 7; // Sun->6, Mon->0...
  x.setDate(x.getDate() - mondayOffset);
  return x;
}

function formatHeaderDate(iso: string) {
  const d = fromISODate(iso);
  // "12 Jan"
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

/* ======================
   DRAG ENGINE (SNAP GRID)
====================== */

type DragMode = "move" | "resize-left" | "resize-right";

function clampRange(startISO: string, endISO: string) {
  // ensure start <= end
  if (fromISODate(startISO).getTime() <= fromISODate(endISO).getTime()) {
    return { startISO, endISO };
  }
  return { startISO: endISO, endISO: startISO };
}

/* ======================
   MAIN
====================== */

export default function TimelineView() {
  // week navigation
  const today = useMemo(() => new Date(), []);
  const [weekStartISO, setWeekStartISO] = useState(() => toISODate(startOfWeekMonday(today)));

  // tasks state (single source of truth for this view; later this becomes global store)
  const [tasks, setTasks] = useState<TimelineTask[]>(() => {
    // align dummy to current week for nicer demo
    const ws = toISODate(startOfWeekMonday(new Date()));
    return [
      {
        id: "1",
        title: "Update Layout Gym Lt.2",
        project: "Precision Gym",
        startDate: addDaysISO(ws, 1), // Tue
        endDate: addDaysISO(ws, 3), // Thu
        status: "In Progress",
        priority: "High",
      },
      {
        id: "2",
        title: "Upload Minutes of Meeting",
        project: "Padel JPF",
        startDate: addDaysISO(ws, 4), // Fri
        endDate: addDaysISO(ws, 5), // Sat
        status: "Waiting Approval",
        priority: "Medium",
      },
      {
        id: "3",
        title: "Review Struktur Atap",
        project: "Rumah Tinggal X",
        startDate: addDaysISO(ws, 4), // Fri
        endDate: addDaysISO(ws, 6), // Sun
        status: "For Review",
        priority: "Urgent",
      },
    ];
  });

  const DAYS = useMemo(() => {
    const arr = [];
    const todayISO = toISODate(new Date());
    for (let i = 0; i < 7; i++) {
      const iso = addDaysISO(weekStartISO, i);
      arr.push({
        idx: i,
        key: DOW[i],
        label: DOW[i],
        date: formatHeaderDate(iso),
        iso,
        isToday: iso === todayISO,
      });
    }
    return arr;
  }, [weekStartISO]);

  function updateTask(id: string, patch: Partial<TimelineTask>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function prevWeek() {
    setWeekStartISO((ws) => addDaysISO(ws, -7));
  }
  function nextWeek() {
    setWeekStartISO((ws) => addDaysISO(ws, 7));
  }
  function goToday() {
    setWeekStartISO(toISODate(startOfWeekMonday(new Date())));
  }

  return (
    <div className="space-y-3">
      {/* TOP BAR */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-neutral-800">This Week</p>
          <p className="text-xs text-neutral-500">Weekly timeline • Interactive • Snap to days</p>
        </div>

        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <button className="rounded-md px-2 py-1 hover:bg-neutral-100" onClick={prevWeek}>
            ← Prev
          </button>
          <button className="rounded-md px-2 py-1 hover:bg-neutral-100" onClick={goToday}>
            Today
          </button>
          <button className="rounded-md px-2 py-1 hover:bg-neutral-100" onClick={nextWeek}>
            Next →
          </button>
        </div>
      </div>

      {/* GRID WRAP */}
      <div className="flex overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        {/* LEFT – TASK LIST */}
        <div className="w-[280px] flex-shrink-0 border-r border-neutral-200">
          <div className="flex h-14 items-center border-b border-neutral-200 px-3 text-xs font-medium text-neutral-500">
            Tasks
          </div>

          {tasks.map((task) => (
            <TaskCell
              key={task.id}
              task={task}
              onRename={(title) => updateTask(task.id, { title })}
            />
          ))}
        </div>

        {/* RIGHT – TIMELINE */}
        <div className="flex-1">
          {/* HEADER */}
          <div className="flex h-14 border-b border-neutral-200">
            {DAYS.map((day) => (
              <div
                key={day.key}
                className={clsx(
                  "flex w-28 flex-shrink-0 flex-col items-center justify-center border-r border-neutral-100",
                  day.isToday && "bg-neutral-50" // ✅ today highlight
                )}
              >
                <span className="text-xs font-medium text-neutral-700">{day.label}</span>
                <span className="text-xs text-neutral-400">{day.date}</span>
              </div>
            ))}
          </div>

          {/* ROWS */}
          {tasks.map((task) => (
            <TimelineRow
              key={task.id}
              task={task}
              weekStartISO={weekStartISO}
              days={DAYS}
              onChange={(patch) => updateTask(task.id, patch)}
            />
          ))}
        </div>
      </div>

      {/* LEGEND (simple) */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <LegendItem label="Not Started" tone="Not Started" />
        <LegendItem label="In Progress" tone="In Progress" />
        <LegendItem label="On Hold" tone="On Hold" />
        <LegendItem label="For Review" tone="For Review" />
        <LegendItem label="Waiting Approval" tone="Waiting Approval" />
        <LegendItem label="Completed" tone="Completed" />
      </div>
    </div>
  );
}

/* ======================
   TASK CELL (INLINE EDIT)
   - commits to global tasks state
   - syncs local input if external update occurs
====================== */

function TaskCell({
  task,
  onRename,
}: {
  task: TimelineTask;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);

  useEffect(() => {
    setValue(task.title);
  }, [task.title]);

  function commit() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== task.title) onRename(trimmed);
    setEditing(false);
  }

  return (
    <div className="flex h-14 flex-col justify-center border-b border-neutral-100 px-3">
      {editing ? (
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setValue(task.title);
              setEditing(false);
            }
          }}
          autoFocus
          className="w-full text-sm font-semibold text-neutral-900 outline-none border-b border-neutral-300"
        />
      ) : (
        <p
          onClick={() => setEditing(true)}
          className="truncate text-sm font-semibold text-neutral-900 cursor-text"
          title="Click to edit"
        >
          {task.title}
        </p>
      )}

      <p className="truncate text-xs text-neutral-500">{task.project}</p>
    </div>
  );
}

/* ======================
   ROW + BAR (SMOOTH DRAG + SNAP)
====================== */

function TimelineRow({
  task,
  weekStartISO,
  days,
  onChange,
}: {
  task: TimelineTask;
  weekStartISO: string;
  days: Array<{ idx: number; iso: string; isToday: boolean }>;
  onChange: (patch: Partial<TimelineTask>) => void;
}) {
  const DAY_PX = 112; // w-28
  const startIdx = diffDaysISO(task.startDate, weekStartISO);
  const endIdx = diffDaysISO(task.endDate, weekStartISO);

  // only render if overlaps visible 7-day window
  const visibleStart = Math.max(0, Math.min(6, startIdx));
  const visibleEnd = Math.max(0, Math.min(6, endIdx));

  const overlaps = !(endIdx < 0 || startIdx > 6);
  const safe = clampRange(task.startDate, task.endDate);

  // drag bookkeeping
  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    origStartISO: string;
    origEndISO: string;
  } | null>(null);

  function onPointerDown(e: React.PointerEvent, mode: DragMode) {
    // only left mouse / primary pointer
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    dragRef.current = {
      mode,
      startX: e.clientX,
      origStartISO: safe.startISO,
      origEndISO: safe.endISO,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    e.preventDefault();

    const { mode, startX, origStartISO, origEndISO } = dragRef.current;
    const dx = e.clientX - startX;
    const deltaDays = Math.round(dx / DAY_PX); // ✅ snap per day

    if (deltaDays === 0) return;

    if (mode === "move") {
      const nextStart = addDaysISO(origStartISO, deltaDays);
      const nextEnd = addDaysISO(origEndISO, deltaDays);
      onChange({ startDate: nextStart, endDate: nextEnd });
      return;
    }

    if (mode === "resize-left") {
      const nextStart = addDaysISO(origStartISO, deltaDays);
      const fixedEnd = origEndISO;
      const ranged = clampRange(nextStart, fixedEnd);
      onChange({ startDate: ranged.startISO, endDate: ranged.endISO });
      return;
    }

    if (mode === "resize-right") {
      const fixedStart = origStartISO;
      const nextEnd = addDaysISO(origEndISO, deltaDays);
      const ranged = clampRange(fixedStart, nextEnd);
      onChange({ startDate: ranged.startISO, endDate: ranged.endISO });
      return;
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragRef.current) return;
    e.preventDefault();
    dragRef.current = null;
  }

  return (
    <div className="relative flex h-14 border-b border-neutral-100">
      {days.map((d, idx) => (
        <div
          key={idx}
          className={clsx(
            "w-28 flex-shrink-0 border-r border-neutral-100",
            d.isToday && "bg-neutral-50" // ✅ today highlight full height
          )}
        />
      ))}

      {/* BAR */}
      {overlaps && (
        <div
          className={clsx(
            "absolute top-3 h-8 rounded-md border px-2 shadow-[0_1px_0_rgba(0,0,0,0.04)] select-none",
            STATUS_BAR_STYLE[task.status]
          )}
          style={{
            left: `${visibleStart * DAY_PX}px`,
            width: `${(visibleEnd - visibleStart + 1) * DAY_PX}px`,
          }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          title={`${task.title} • ${task.status}`}
        >
          {/* resize handle left */}
          <div
            className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
            onPointerDown={(e) => onPointerDown(e, "resize-left")}
          />

          {/* resize handle right */}
          <div
            className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
            onPointerDown={(e) => onPointerDown(e, "resize-right")}
          />

          {/* move area */}
          <div
            className="flex h-full items-center justify-between gap-2"
            onPointerDown={(e) => onPointerDown(e, "move")}
          >
            <p className="truncate text-xs font-medium leading-8 cursor-grab">
              {task.title}
            </p>

            {task.priority && (
              <span className="hidden shrink-0 rounded bg-white/60 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700 sm:inline">
                {task.priority}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================
   LEGEND
====================== */

function LegendItem({ label, tone }: { label: string; tone: TaskStatus }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1">
      <span className={clsx("h-2.5 w-2.5 rounded-sm border", STATUS_BAR_STYLE[tone])} />
      <span>{label}</span>
    </div>
  );
}
