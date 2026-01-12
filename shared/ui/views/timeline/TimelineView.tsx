"use client";

import { useMemo, useState } from "react";
import { TimelineTask } from "./timeline.types";
import { TimelineTaskCell } from "./TimelineTaskCell";
import { TimelineRow } from "./TimelineRow";
import { TimelineLegend } from "./TimelineLegend";
import { DOW } from "./timeline.constants";
import { addDaysISO, startOfWeekMonday, toISODate } from "./timeline.utils";

export function TimelineView({
  tasks,
  setTasks,
}: {
  tasks: TimelineTask[];
  setTasks: React.Dispatch<React.SetStateAction<TimelineTask[]>>;
}) {
  const today = new Date();
  const [weekStartISO, setWeekStartISO] = useState(
    toISODate(startOfWeekMonday(today))
  );

  const DAYS = useMemo(() => {
    const todayISO = toISODate(new Date());
    return Array.from({ length: 7 }).map((_, i) => {
      const iso = addDaysISO(weekStartISO, i);
      return {
        iso,
        isToday: iso === todayISO,
        label: DOW[i],
      };
    });
  }, [weekStartISO]);

  function update(id: string, patch: Partial<TimelineTask>) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <div>
          <p className="text-sm font-medium">This Week</p>
          <p className="text-xs text-neutral-500">Weekly timeline</p>
        </div>
        <div className="flex gap-2 text-sm">
          <button onClick={() => setWeekStartISO(addDaysISO(weekStartISO, -7))}>
            ← Prev
          </button>
          <button onClick={() => setWeekStartISO(toISODate(startOfWeekMonday(new Date())))}>Today</button>
          <button onClick={() => setWeekStartISO(addDaysISO(weekStartISO, 7))}>
            Next →
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <div className="w-[280px] flex-shrink-0 border-r border-neutral-200">
          <div className="h-14 border-b px-3 text-xs font-medium text-neutral-500 flex items-center">
            Tasks
          </div>
          {tasks.map((t) => (
            <TimelineTaskCell
              key={t.id}
              task={t}
              onRename={(title) => update(t.id, { title })}
            />
          ))}
        </div>

        <div className="flex-1">
          <div className="flex h-14 border-b">
            {DAYS.map((d) => (
              <div
                key={d.iso}
                className="w-28 border-r border-neutral-100 flex flex-col items-center justify-center"
              >
                <span className="text-xs font-medium">{d.label}</span>
                <span className="text-xs text-neutral-400">{d.iso.slice(-2)}</span>
              </div>
            ))}
          </div>

          {tasks.map((t) => (
            <TimelineRow
              key={t.id}
              task={t}
              weekStartISO={weekStartISO}
              days={DAYS}
              onChange={(p) => update(t.id, p)}
            />
          ))}
        </div>
      </div>

      <TimelineLegend />
    </div>
  );
}
