"use client";

import {
  DndContext,
  DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import clsx from "clsx";

/* ======================
   TYPES & CONSTANTS
====================== */

const STATUSES = [
  "Not Started",
  "In Progress",
  "For Review",
  "Waiting Approval",
  "Completed",
] as const;

type Status = (typeof STATUSES)[number];
type Priority = "Urgent" | "High" | "Medium" | "Low";

type Subtask = {
  id: string;
  label: string;
  done: boolean;
};

type Task = {
  id: string;
  title: string;
  project: string;
  stage: string;
  priority: Priority;
  status: Status;
  manualStatus?: boolean;
  subtasks: Subtask[];
};

const STATUS_BG: Record<Status, string> = {
  "Not Started": "bg-neutral-100",
  "In Progress": "bg-blue-50",
  "For Review": "bg-yellow-50",
  "Waiting Approval": "bg-purple-50",
  "Completed": "bg-green-50",
};

/* ======================
   PAGE
====================== */

export default function BoardView() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Update Layout Gym Lt.2",
      project: "Precision Gym",
      stage: "DD",
      priority: "High",
      status: "In Progress",
      subtasks: [
        { id: "1-1", label: "Revisi zoning alat", done: true },
        { id: "1-2", label: "Update layout kardio", done: true },
        { id: "1-3", label: "Koordinasi struktur", done: false },
        { id: "1-4", label: "Export PDF", done: false },
      ],
    },
    {
      id: "2",
      title: "Upload Minutes of Meeting",
      project: "Padel JPF",
      stage: "ED",
      priority: "Medium",
      status: "Not Started",
      subtasks: [
        { id: "2-1", label: "Rapihin catatan", done: false },
        { id: "2-2", label: "Export PDF", done: false },
      ],
    },
    {
      id: "3",
      title: "Review Struktur Atap",
      project: "Rumah Tinggal X",
      stage: "TD",
      priority: "Urgent",
      status: "For Review",
      subtasks: [
        { id: "3-1", label: "Cek bentang & profil", done: true },
        { id: "3-2", label: "Approval final", done: true },
      ],
    },
  ]);

  /* ===== DRAG → STATUS ===== */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === active.id
          ? {
              ...t,
              status: over.id as Status,
              manualStatus: true,
            }
          : t
      )
    );
  }

  /* ===== AUTO STATUS FROM SUBTASK ===== */
  useEffect(() => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.manualStatus) return t;

        const done = t.subtasks.filter((s) => s.done).length;
        const total = t.subtasks.length;

        const autoStatus: Status =
          done === 0
            ? "Not Started"
            : done < total
            ? "In Progress"
            : "Completed";

        return { ...t, status: autoStatus };
      })
    );
  }, []);

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={tasks.filter((t) => t.status === status)}
            setTasks={setTasks}
          />
        ))}
      </div>
    </DndContext>
  );
}

/* ======================
   COLUMN
====================== */

function Column({
  status,
  tasks,
  setTasks,
}: {
  status: Status;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div ref={setNodeRef} id={status} className="min-w-[240px]">
      {/* HEADER FIXED */}
      <h3 className="mb-2 text-sm font-medium text-neutral-700">
        {status}
        <span className="ml-1 text-xs text-neutral-400">
          ({tasks.length})
        </span>
      </h3>

      <div
        className={clsx(
          "space-y-3 rounded-2xl p-2",
          STATUS_BG[status]
        )}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            setTasks={setTasks}
          />
        ))}
      </div>
    </div>
  );
}

/* ======================
   TASK CARD
====================== */

function TaskCard({
  task,
  setTasks,
}: {
  task: Task;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
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
      prev.map((t) => {
        if (t.id !== task.id) return t;

        return {
          ...t,
          manualStatus: false,
          subtasks: t.subtasks.map((s) =>
            s.id === id ? { ...s, done: !s.done } : s
          ),
        };
      })
    );
  }

  return (
    <div
      className="rounded-[8px] border border-neutral-200 bg-white p-3 hover:shadow-sm transition"
      style={style}
    >
      {/* HEADER + DRAG HANDLE */}
      <div className="flex items-start gap-2">
        {/* DRAG HANDLE */}
        <button
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          className="mt-1 cursor-grab text-neutral-400 hover:text-neutral-600"
          title="Drag"
        >
          ⠿
        </button>

        {/* TITLE */}
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
            {task.project} · {task.stage}
          </p>
        </div>
      </div>

      {/* PROGRESS */}
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

      {/* SUBTASK TOGGLE */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 text-xs text-neutral-500 hover:underline"
      >
        {expanded ? "Hide" : "Show"} subtasks ({total})
      </button>

      {/* SUBTASK LIST */}
      {expanded && (
        <div className="mt-2 space-y-1">
          {task.subtasks.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-2 text-xs cursor-pointer"
            >
              <input
                type="checkbox"
                checked={s.done}
                onChange={() => toggleSubtask(s.id)}
              />
              <span
                className={clsx(
                  s.done &&
                    "line-through text-neutral-400"
                )}
              >
                {s.label}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* PRIORITY */}
      <div className="mt-2">
        <PriorityBadge priority={task.priority} />
      </div>
    </div>
  );
}


/* ======================
   PRIORITY BADGE
====================== */

function PriorityBadge({ priority }: { priority: Priority }) {
  const styles: Record<Priority, string> = {
    Urgent: "bg-red-50 text-brand-red",
    High: "bg-orange-50 text-orange-700",
    Medium: "bg-neutral-100 text-neutral-600",
    Low: "bg-neutral-100 text-neutral-400",
  };

  return (
    <span
      className={clsx(
        "inline-block rounded px-2 py-0.5 text-xs font-medium",
        styles[priority]
      )}
    >
      {priority}
    </span>
  );
}
