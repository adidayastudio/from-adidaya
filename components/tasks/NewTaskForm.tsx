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

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="rounded-md bg-brand-red px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-red/90"
        >
          Create Task
        </button>
      </div>
    </div>
  );
}
