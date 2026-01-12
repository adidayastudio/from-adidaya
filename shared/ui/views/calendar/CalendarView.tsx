"use client";

import { useState } from "react";
import { CalendarTask } from "./calendar.types";
import { CalendarGrid } from "./CalendarGrid";
import {
  startOfMonth,
  toISO,
} from "./calendar.utils";
import { STATUS_STYLE } from "./calendar.constants";

export function CalendarView({
  tasks,
  setTasks,
}: {
  tasks: CalendarTask[];
  setTasks: React.Dispatch<React.SetStateAction<CalendarTask[]>>;
}) {
  const todayISO = toISO(new Date());
  const [monthDate, setMonthDate] = useState(
    startOfMonth(new Date())
  );

  const monthLabel = monthDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  function updateTask(id: string, dateISO: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, dateISO } : t
      )
    );
  }

  return (
    <div className="space-y-3">
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
            onClick={() =>
              setMonthDate(
                new Date(
                  monthDate.getFullYear(),
                  monthDate.getMonth() - 1,
                  1
                )
              )
            }
            className="rounded-md px-2 py-1 hover:bg-neutral-100"
          >
            ← Prev
          </button>
          <button
            onClick={() =>
              setMonthDate(startOfMonth(new Date()))
            }
            className="rounded-md px-2 py-1 hover:bg-neutral-100"
          >
            Today
          </button>
          <button
            onClick={() =>
              setMonthDate(
                new Date(
                  monthDate.getFullYear(),
                  monthDate.getMonth() + 1,
                  1
                )
              )
            }
            className="rounded-md px-2 py-1 hover:bg-neutral-100"
          >
            Next →
          </button>
        </div>
      </div>

      <CalendarGrid
        monthDate={monthDate}
        tasks={tasks}
        todayISO={todayISO}
        onMoveTask={updateTask}
      />

      <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
        {Object.entries(STATUS_STYLE).map(
          ([status, style]) => (
            <div
              key={status}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1"
            >
              <span
                className={`h-2.5 w-2.5 rounded-sm ${style}`}
              />
              <span>{status}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
