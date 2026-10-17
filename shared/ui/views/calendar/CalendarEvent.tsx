"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { CalendarTask } from "./calendar.types";
import { STATUS_STYLE } from "./calendar.constants";

export function CalendarEvent({ task }: { task: CalendarTask }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);

  useEffect(() => {
    setValue(task.title);
  }, [task.title]);

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
          onBlur={() => setEditing(false)}
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