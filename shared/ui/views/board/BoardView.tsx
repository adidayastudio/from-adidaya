"use client";

import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { useEffect } from "react";
import { STATUSES, Status, BoardTask } from "./board.types";
import { BoardColumn } from "./BoardColumn";

export function BoardView({
  tasks,
  setTasks,
}: {
  tasks: BoardTask[];
  setTasks: React.Dispatch<React.SetStateAction<BoardTask[]>>;
}) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === active.id
          ? { ...t, status: over.id as Status, manualStatus: true }
          : t
      )
    );
  }

  // auto status from subtasks
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
  }, [setTasks]);

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {STATUSES.map((status) => (
          <BoardColumn
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
