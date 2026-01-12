"use client";

import { useEffect, useState } from "react";
import { TimelineTask } from "./timeline.types";

export function TimelineTaskCell({
  task,
  onRename,
}: {
  task: TimelineTask;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);

  useEffect(() => setValue(task.title), [task.title]);

  function commit() {
    const t = value.trim();
    if (t && t !== task.title) onRename(t);
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
          className="w-full text-sm font-semibold outline-none border-b border-neutral-300"
        />
      ) : (
        <p
          onClick={() => setEditing(true)}
          className="truncate text-sm font-semibold cursor-text"
        >
          {task.title}
        </p>
      )}
      <p className="truncate text-xs text-neutral-500">{task.project}</p>
    </div>
  );
}
