"use client";

import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import { BoardTask, Status } from "./board.types";
import { STATUS_BG } from "./board.constants";
import { BoardCard } from "./BoardCard";

export function BoardColumn({
  status,
  tasks,
  setTasks,
}: {
  status: Status;
  tasks: BoardTask[];
  setTasks: React.Dispatch<React.SetStateAction<BoardTask[]>>;
}) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div ref={setNodeRef} className="min-w-[260px]">
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
          <BoardCard
            key={task.id}
            task={task}
            setTasks={setTasks}
          />
        ))}
      </div>
    </div>
  );
}
