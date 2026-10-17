"use client";

import { useState } from "react";

type TabKey = "today" | "overdue" | "week";

type Task = {
  id: string;
  title: string;
  project: string;
  due: string;
  overdue?: boolean;
  completed?: boolean;
};

const TASKS: Record<TabKey, Task[]> = {
  today: [
    {
      id: "t1",
      title: "Finalize render approval",
      project: "JPadel Fatmawati",
      due: "Today",
    },
    {
      id: "t2",
      title: "Update ED drawings",
      project: "Precision Gym",
      due: "Today",
    },
  ],
  overdue: [
    {
      id: "t3",
      title: "Submit handover document",
      project: "Torpedo Clinic",
      due: "Yesterday",
      overdue: true,
    },
  ],
  week: [
    {
      id: "t4",
      title: "Prepare site meeting material",
      project: "Precision Gym",
      due: "Fri",
    },
  ],
};

export default function MyTasksCard() {
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const tasks = TASKS[activeTab];

  function toggleComplete(id: string) {
    setCompletedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  return (
    <section className="rounded-[8px] bg-neutral-100 p-4">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-neutral-900">
            My Tasks
          </h3>

          {/* TABS */}
          <div className="flex gap-1">
            <TabButton
              label="Today"
              active={activeTab === "today"}
              variant="default"
              onClick={() => setActiveTab("today")}
            />
            <TabButton
              label="Overdue"
              active={activeTab === "overdue"}
              variant="danger"
              onClick={() => setActiveTab("overdue")}
            />
            <TabButton
              label="This Week"
              active={activeTab === "week"}
              variant="default"
              onClick={() => setActiveTab("week")}
            />
          </div>
        </div>

        <button className="text-xs text-neutral-500 hover:text-red-600 transition">
          View all
        </button>
      </div>

      {/* TASK LIST */}
      <div className="divide-y divide-neutral-300/40">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            completed={completedIds.includes(task.id)}
            onToggle={() => toggleComplete(task.id)}
            onClick={() => {
              // nanti: router.push(`/tasks/${task.id}`)
              console.log("Go to task:", task.id);
            }}
          />
        ))}
      </div>
    </section>
  );
}

/* ======================
   SUB COMPONENTS
====================== */

function TabButton({
  label,
  active,
  variant,
  onClick,
}: {
  label: string;
  active: boolean;
  variant: "default" | "danger";
  onClick: () => void;
}) {
  const base =
    "px-2 py-1 text-xs rounded-md transition";

  const activeStyle =
    variant === "danger"
      ? "bg-red-600 text-white"
      : "bg-neutral-900 text-white";

  const inactiveStyle =
    "text-neutral-500 hover:text-neutral-900";

  return (
    <button
      onClick={onClick}
      className={`${base} ${active ? activeStyle : inactiveStyle}`}
    >
      {label}
    </button>
  );
}

function TaskRow({
  task,
  completed,
  onToggle,
  onClick,
}: {
  task: Task;
  completed: boolean;
  onToggle: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-white transition cursor-pointer"
      onClick={onClick}
    >
      <input
        type="checkbox"
        checked={completed}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="accent-neutral-800"
      />

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            completed
              ? "line-through text-neutral-400"
              : "text-neutral-900"
          }`}
        >
          {task.title}
        </p>
        <p className="text-xs text-neutral-500 truncate">
          {task.project}
        </p>
      </div>

      <span
        className={`text-xs whitespace-nowrap ${
          task.overdue
            ? "text-red-600"
            : "text-neutral-500"
        }`}
      >
        {task.due}
      </span>
    </div>
  );
}
