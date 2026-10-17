"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import clsx from "clsx";
import { BoardTask } from "./board.types";

export function BoardCard({
  task,
  setTasks,
}: {
  task: BoardTask;
  setTasks: React.Dispatch<React.SetStateAction<BoardTask[]>>;
}) {
  const { attributes, listeners, setNodeRef, transform } =
    useDraggable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const doneCount = task.subtasks.filter((s) => s.done).length;
  const total = task.subtasks.length;
  const progress = Math.round((doneCount / total) * 100);

  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  function toggleSubtask(id: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id !== task.id
          ? t
          : {
              ...t,
              manualStatus: false,
              subtasks: t.subtasks.map((s) =>
                s.id === id ? { ...s, done: !s.done } : s
              ),
            }
      )
    );
  }

  return (
    <div
      className="rounded-lg border border-neutral-200 bg-white p-3 hover:shadow-sm transition"
      style={style}
    >
      <div className="flex items-start gap-2">
        <button
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          className="mt-1 cursor-grab text-neutral-400 hover:text-neutral-600"
        >
          ⠿
        </button>

        <div className="flex-1">
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) =>
                e.key === "Enter" && setEditing(false)
              }
              autoFocus
              className="w-full text-sm font-semibold outline-none border-b border-neutral-300"
            />
          ) : (
            <p
              onClick={() => setEditing(true)}
              className={clsx(
                "text-sm font-semibold cursor-text",
                task.status === "Completed" &&
                  "line-through text-neutral-400"
              )}
            >
              {title}
            </p>
          )}

          <p className="text-xs text-neutral-500">
            {task.projectCode && `${task.projectCode} · `}
            {task.project} · {task.stage}
          </p>
        </div>
      </div>

      <div className="mt-2">
        <div className="h-1.5 w-full rounded-full bg-neutral-200">
          <div
            className="h-1.5 rounded-full bg-brand-red"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-0.5 text-xs text-neutral-500">
          {doneCount}/{total}
        </p>
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 text-xs text-neutral-500 hover:underline"
      >
        {expanded ? "Hide" : "Show"} subtasks ({total})
      </button>

      {expanded && (
        <div className="mt-2 space-y-1">
          {task.subtasks.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-2 text-xs"
            >
              <input
                type="checkbox"
                checked={s.done}
                onChange={() => toggleSubtask(s.id)}
              />
              <span
                className={clsx(
                  s.done && "line-through text-neutral-400"
                )}
              >
                {s.label}
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="mt-2">
        <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-neutral-100">
          {task.priority}
        </span>
      </div>
    </div>
  );
}
