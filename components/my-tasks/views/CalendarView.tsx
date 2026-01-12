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

type CalendarTask = {
  id: string;
  title: string;
  dateISO: string; // YYYY-MM-DD (single source of truth)
  status: TaskStatus;
};

/* ======================
   STATUS STYLE
====================== */

const STATUS_STYLE: Record<TaskStatus, string> = {
  "Not Started": "bg-neutral-200 text-neutral-800",
  "In Progress": "bg-blue-100 text-blue-800",
  "On Hold": "bg-orange-100 text-orange-800",
  "For Review": "bg-yellow-100 text-yellow-800",
  "Waiting Approval": "bg-purple-100 text-purple-800",
  "Completed": "bg-green-100 text-green-800",
};

/* ======================
   DATE HELPERS
====================== */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addDaysISO(iso: string, days: number) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/* ======================
   COMPONENT
====================== */

export default function CalendarView() {
  const todayISO = toISO(new Date());

  const [monthDate, setMonthDate] = useState<Date>(
    startOfMonth(new Date())
  );

const [tasks, setTasks] = useState<CalendarTask[]>([
  // === WEEK 1 ===
  {
    id: "t1",
    title: "Update Layout Gym Lt.2",
    dateISO: "2025-01-12", // Sun
    status: "In Progress",
  },
  {
    id: "t2",
    title: "Client Coordination Call",
    dateISO: "2025-01-13",
    status: "Not Started",
  },

  // === WEEK 2 (TODAY TEST: 14 JAN) ===
  {
    id: "t3",
    title: "Upload Minutes of Meeting",
    dateISO: "2025-01-14", // Today (example)
    status: "Waiting Approval",
  },
  {
    id: "t4",
    title: "Prepare Presentation Deck",
    dateISO: "2025-01-14",
    status: "In Progress",
  },
  {
    id: "t5",
    title: "Internal Design Review",
    dateISO: "2025-12-14",
    status: "For Review",
  },

  // === OVERFLOW TEST (+n more) ===
  {
    id: "t6",
    title: "Review Struktur Atap",
    dateISO: "2025-12-18", // Sat
    status: "For Review",
  },
  {
    id: "t7",
    title: "Final Drawing",
    dateISO: "2025-12-18",
    status: "Completed",
  },
  {
    id: "t8",
    title: "Client Approval",
    dateISO: "2025-12-18",
    status: "Waiting Approval",
  },
  {
    id: "t9",
    title: "MEP Coordination",
    dateISO: "2025-12-18",
    status: "In Progress",
  },

  // === END OF MONTH ===
  {
    id: "t10",
    title: "Monthly Report Submission",
    dateISO: "2025-12-31",
    status: "Not Started",
  },

  // === CROSS MONTH (MUTED CELL TEST) ===
  {
    id: "t11",
    title: "Kickoff February Project",
    dateISO: "2025-12-01",
    status: "Not Started",
  },
]);


  /* ===== MONTH META ===== */

  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const monthLabel = monthDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const startOffset = (start.getDay() + 6) % 7; // Mon=0
  const totalDays = end.getDate();

  const cells = Array.from({ length: startOffset + totalDays });

  function prevMonth() {
    setMonthDate(
      new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)
    );
  }

  function nextMonth() {
    setMonthDate(
      new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
    );
  }

  function goToday() {
    setMonthDate(startOfMonth(new Date()));
  }

  /* ===== UPDATE TASK ===== */

  function updateTask(id: string, patch: Partial<CalendarTask>) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  }

  /* ======================
     RENDER
  ====================== */

  return (
    <div className="space-y-3">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-800">
            {monthLabel}
          </p>
          <p className="text-xs text-neutral-500">
            Monthly calendar view
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <button
            onClick={prevMonth}
            className="rounded-md px-2 py-1 hover:bg-neutral-100"
          >
            ← Prev
          </button>
          <button
            onClick={goToday}
            className="rounded-md px-2 py-1 hover:bg-neutral-100"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="rounded-md px-2 py-1 hover:bg-neutral-100"
          >
            Next →
          </button>
        </div>
      </div>

      {/* GRID */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {/* DAY HEADER */}
        <div className="grid grid-cols-7 border-b border-neutral-200">
          {DAYS.map((day, i) => (
            <div
              key={day}
              className={clsx(
                "px-2 py-2 text-xs font-medium",
                i === 6 ? "text-red-600" : "text-neutral-600",
                i !== 6 && "border-r border-neutral-100"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* DATE CELLS */}
        <div className="grid grid-cols-7">
          {cells.map((_, index) => {
            const dateNum = index - startOffset + 1;
            const isValid =
              dateNum > 0 && dateNum <= totalDays;

            const dateISO = isValid
              ? toISO(
                  new Date(
                    monthDate.getFullYear(),
                    monthDate.getMonth(),
                    dateNum
                  )
                )
              : "";

            const isToday = dateISO === todayISO;
            const dayIndex = index % 7;
            const isSunday = dayIndex === 6;

            const dayTasks = isValid
              ? tasks.filter((t) => t.dateISO === dateISO)
              : [];

            return (
              <CalendarCell
                key={index}
                dateNum={dateNum}
                dateISO={dateISO}
                isValid={isValid}
                isToday={isToday}
                isSunday={isSunday}
                tasks={dayTasks}
                onMoveTask={(taskId) =>
                  updateTask(taskId, { dateISO })
                }
              />
            );
          })}
        </div>
      </div>

      {/* LEGEND */}
      <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
        {Object.entries(STATUS_STYLE).map(([status, style]) => (
          <div
            key={status}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1"
          >
            <span className={clsx("h-2.5 w-2.5 rounded-sm", style)} />
            <span>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ======================
   CELL
====================== */

function CalendarCell({
  dateNum,
  dateISO,
  isValid,
  isToday,
  isSunday,
  tasks,
  onMoveTask,
}: {
  dateNum: number;
  dateISO: string;
  isValid: boolean;
  isToday: boolean;
  isSunday: boolean;
  tasks: CalendarTask[];
  onMoveTask: (taskId: string) => void;
}) {
  const dropRef = useRef<HTMLDivElement>(null);

  function onDrop(e: React.DragEvent) {
    const taskId = e.dataTransfer.getData("task-id");
    if (taskId && isValid) {
      onMoveTask(taskId);
    }
  }

  return (
    <div
      ref={dropRef}
      onDragOver={(e) => isValid && e.preventDefault()}
      onDrop={onDrop}
      className={clsx(
        "min-h-[96px] border-b border-neutral-100 p-2 transition-colors",
        !isValid && "bg-neutral-50",
        isToday && "bg-neutral-50",
        isValid && "hover:bg-neutral-50"
      )}
    >
      {isValid && (
        <>
          <p
            className={clsx(
              "mb-1 text-xs font-medium",
              isSunday ? "text-red-600" : "text-neutral-600"
            )}
          >
            {dateNum}
          </p>

          <div className="space-y-1">
            {tasks.slice(0, 2).map((task) => (
              <CalendarTaskItem key={task.id} task={task} />
            ))}

            {tasks.length > 2 && (
              <p className="text-xs text-neutral-400">
                +{tasks.length - 2} more
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ======================
   TASK ITEM
====================== */

function CalendarTaskItem({ task }: { task: CalendarTask }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);

  useEffect(() => {
    setValue(task.title);
  }, [task.title]);

  function commit() {
    setEditing(false);
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("task-id", task.id);
      }}
      className={clsx(
        "truncate rounded px-1.5 py-0.5 text-xs cursor-grab",
        STATUS_STYLE[task.status]
      )}
      title={task.title}
    >
      {editing ? (
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          className="w-full bg-transparent outline-none"
        />
      ) : (
        <span onDoubleClick={() => setEditing(true)}>
          {task.title}
        </span>
      )}
    </div>
  );
}
