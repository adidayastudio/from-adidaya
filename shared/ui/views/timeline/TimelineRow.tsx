"use client";

import { useMemo, useRef } from "react";
import clsx from "clsx";
import { TimelineTask } from "./timeline.types";
import { DAY_PX, STATUS_BAR_STYLE } from "./timeline.constants";
import { addDaysISO, clampRange, diffDaysISO } from "./timeline.utils";

type DragMode = "move" | "resize-left" | "resize-right";

type DragState = {
  mode: DragMode;
  startX: number;
  origStart: string;
  origEnd: string;
  pointerId: number;
};

export function TimelineRow({
  task,
  weekStartISO,
  days,
  onChange,
}: {
  task: TimelineTask;
  weekStartISO: string;
  days: Array<{ iso: string; isToday: boolean }>;
  onChange: (patch: Partial<TimelineTask>) => void;
}) {
  const dragRef = useRef<DragState | null>(null);

  // ---------- compute placement ----------
  const { overlaps, visibleStart, visibleEnd } = useMemo(() => {
    const startIdx = diffDaysISO(task.startDate, weekStartISO);
    const endIdx = diffDaysISO(task.endDate, weekStartISO);

    const overlaps = !(endIdx < 0 || startIdx > 6);
    const visibleStart = Math.max(0, Math.min(6, startIdx));
    const visibleEnd = Math.max(0, Math.min(6, endIdx));

    return { overlaps, visibleStart, visibleEnd };
  }, [task.startDate, task.endDate, weekStartISO]);

  // ---------- drag engine ----------
  function beginDrag(e: React.PointerEvent, mode: DragMode) {
    // only primary button
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    // IMPORTANT: keep receiving pointermove even if cursor leaves the bar
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    dragRef.current = {
      mode,
      startX: e.clientX,
      origStart: task.startDate,
      origEnd: task.endDate,
      pointerId: e.pointerId,
    };
  }

  function getDeltaDays(dx: number) {
    // snap per day; use floor/ceil so it "activates" only after crossing each column
    return dx > 0 ? Math.floor(dx / DAY_PX) : Math.ceil(dx / DAY_PX);
  }

  function applyDrag(e: React.PointerEvent) {
    const st = dragRef.current;
    if (!st) return;

    // ignore other pointers (touch multi)
    if (e.pointerId !== st.pointerId) return;

    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - st.startX;
    const delta = getDeltaDays(dx);
    if (delta === 0) return;

    const { mode, origStart, origEnd } = st;

    if (mode === "move") {
      const nextStart = addDaysISO(origStart, delta);
      const nextEnd = addDaysISO(origEnd, delta);

      onChange({ startDate: nextStart, endDate: nextEnd });

      // ✅ key part: rebase drag origin after each snap step
      dragRef.current = {
        ...st,
        startX: e.clientX,
        origStart: nextStart,
        origEnd: nextEnd,
      };
      return;
    }

    if (mode === "resize-left") {
      const nextStart = addDaysISO(origStart, delta);
      const ranged = clampRange(nextStart, origEnd); // { startDate, endDate }

      onChange(ranged);

      dragRef.current = {
        ...st,
        startX: e.clientX,
        origStart: ranged.startDate!,
        origEnd: ranged.endDate!,
      };
      return;
    }

    if (mode === "resize-right") {
      const nextEnd = addDaysISO(origEnd, delta);
      const ranged = clampRange(origStart, nextEnd);

      onChange(ranged);

      dragRef.current = {
        ...st,
        startX: e.clientX,
        origStart: ranged.startDate!,
        origEnd: ranged.endDate!,
      };
    }
  }

  function endDrag(e: React.PointerEvent) {
    const st = dragRef.current;
    if (!st) return;

    if (e.pointerId === st.pointerId) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = null;
    }
  }

  // ---------- render ----------
  return (
    <div className="relative flex h-14 border-b border-neutral-100">
      {days.map((d, i) => (
        <div
          key={i}
          className={clsx(
            "w-28 flex-shrink-0 border-r border-neutral-100",
            d.isToday && "bg-neutral-50"
          )}
        />
      ))}

      {overlaps && (
        <div
          className={clsx(
            "absolute top-3 h-8 rounded-md border px-2 select-none",
            STATUS_BAR_STYLE[task.status]
          )}
          style={{
            left: visibleStart * DAY_PX,
            width: (visibleEnd - visibleStart + 1) * DAY_PX,
          }}
          // ✅ attach move/up to the bar itself (capture handles leaving area)
          onPointerMove={applyDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {/* left resize handle */}
          <div
            className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
            onPointerDown={(e) => beginDrag(e, "resize-left")}
          />

          {/* right resize handle */}
          <div
            className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
            onPointerDown={(e) => beginDrag(e, "resize-right")}
          />

          {/* move area */}
          <div
            className="flex h-full items-center justify-between gap-2"
            onPointerDown={(e) => beginDrag(e, "move")}
          >
            <p className="truncate text-xs font-medium cursor-grab">
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
