"use client";

import { useState } from "react";
import { useNewTask } from "@/hooks/useNewTask";
import TaskFields from "./TaskFields";

export default function NewTaskForm({
  onClose,
}: {
  onClose: () => void;
}) {
  const { createTask } = useNewTask();

  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [priority, setPriority] = useState<
    "Low" | "Medium" | "High" | "Urgent"
  >("Medium");
  const [deadline, setDeadline] = useState<string | undefined>();

  function handleSubmit() {
    if (!title.trim()) return;

    createTask({
      title,
      project,
      priority,
      deadline,
    });

    onClose();
  }

  return (
    <div className="space-y-4 px-4 py-4">
      <TaskFields.Title value={title} onChange={setTitle} />

      <TaskFields.Project
        value={project}
        onChange={setProject}
      />

      <TaskFields.Priority
        value={priority}
        onChange={setPriority}
      />

      <TaskFields.Deadline
        value={deadline}
        onChange={setDeadline}
        onClear={() => setDeadline(undefined)}
      />

      <div className="px-8 pb-10 pt-4 flex flex-col gap-3 relative z-10">
        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="w-full bg-blue-500 text-white h-[64px] rounded-full font-bold text-[17px] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/30 border border-white/20 disabled:opacity-50 disabled:active:scale-100"
        >
          Create Task
        </button>
        <button
          onClick={onClose}
          className="w-full bg-white/50 backdrop-blur-xl border border-black/5 h-[64px] rounded-full font-bold text-[17px] text-neutral-700 active:scale-[0.98] transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
