"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import { InlineEditor } from "./InlineEditor";
import { ProgressInline } from "./ProgressInline";
import { StatusSelect } from "./StatusSelect";
import { PriorityPill } from "./meta/PriorityPill";
import { DuePill } from "./meta/DuePill";

type Status =
  | "Not Started"
  | "In Progress"
  | "On Hold"
  | "For Review"
  | "Waiting Approval"
  | "Completed";

type Subtask = { id: string; label: string; done: boolean };

export function ListItem({
  title,
  project,
  projectCode,
  stage,
  priority,
  due,
  subtasks,
  defaultExpanded = true,
  initialStatus = null,
}: {
  title: string;
  project: string;
  projectCode?: string;
  stage: string;
  priority: string;
  due: string;
  subtasks: Subtask[];
  defaultExpanded?: boolean;
  initialStatus?: Status | null;
}) {
  const [items, setItems] = useState(subtasks);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [manualStatus, setManualStatus] = useState<Status | null>(initialStatus);

  const total = items.length;
  const doneCount = useMemo(() => items.filter((x) => x.done).length, [items]);
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const autoStatus: Status =
    doneCount === 0
      ? "Not Started"
      : doneCount < total
      ? "In Progress"
      : "Completed";

  const status = manualStatus ?? autoStatus;
  const isCompleted = status === "Completed";

  useEffect(() => {
    if (manualStatus === "Completed" && doneCount < total) {
      setManualStatus(null);
    }
  }, [doneCount, total, manualStatus]);

  function toggleSubtask(id: string) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it))
    );
    setManualStatus(null);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 hover:shadow-sm transition">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <InlineEditor
            value={title}
            completed={isCompleted}
          />
          <p className="mt-1 text-xs text-neutral-500">
            {projectCode && (
                <span className="font-medium text-neutral-600">
                {projectCode}
                </span>
            )}
            {projectCode && " · "}
            {project} · {stage}
            </p>

        </div>

        <div className="hidden md:block w-64">
          <ProgressInline
            value={percent}
            label={`${doneCount}/${total}`}
            dimmed={isCompleted}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PriorityPill value={priority} />
          <DuePill value={due} />
          <StatusSelect value={status} onChange={setManualStatus} />
        </div>
      </div>

      {/* MOBILE PROGRESS */}
      <div className="mt-3 md:hidden">
        <ProgressInline value={percent} label={`${doneCount}/${total}`} />
      </div>

      {/* SUBTASKS */}
      <div className="mt-3">
        <button
          onClick={() => setExpanded((s) => !s)}
          className="text-xs text-neutral-500 hover:underline"
        >
          {expanded ? "Hide" : "Show"} subtasks ({total})
        </button>

        {expanded && (
          <div className="mt-2 space-y-1">
            {items.map((it) => (
              <label key={it.id} className="flex items-center gap-2 text-xs">
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
    </div>
  );
}
