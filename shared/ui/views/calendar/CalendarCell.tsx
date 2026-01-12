"use client";

import { useRef } from "react";
import clsx from "clsx";
import { CalendarTask } from "./calendar.types";
import { CalendarEvent } from "./CalendarEvent";

export function CalendarCell({
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
  const ref = useRef<HTMLDivElement>(null);

  function onDrop(e: React.DragEvent) {
    const taskId = e.dataTransfer.getData("task-id");
    if (taskId && isValid) {
      onMoveTask(taskId);
    }
  }

  return (
    <div
      ref={ref}
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
              <CalendarEvent key={task.id} task={task} />
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
