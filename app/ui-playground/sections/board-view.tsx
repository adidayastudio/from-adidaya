"use client";

import { useState } from "react";
import { BoardView } from "@/shared/ui/views/board/BoardView";
import { BoardTask } from "@/shared/ui/views/board/board.types";

export default function BoardViewPlayground() {
  const [tasks, setTasks] = useState<BoardTask[]>([
    {
      id: "1",
      title: "Update Layout Gym Lt.2",
      project: "Precision Gym",
      projectCode: "PRG",
      stage: "DD",
      priority: "High",
      status: "In Progress",
      subtasks: [
        { id: "1-1", label: "Revisi zoning alat", done: true },
        { id: "1-2", label: "Update layout kardio", done: true },
        { id: "1-3", label: "Koordinasi struktur", done: false },
      ],
    },
    {
      id: "2",
      title: "Upload Minutes of Meeting",
      project: "Padel JPF",
      projectCode: "JPF",
      stage: "ED",
      priority: "Medium",
      status: "Not Started",
      subtasks: [
        { id: "2-1", label: "Rapihin catatan", done: false },
      ],
    },
  ]);

  return <BoardView tasks={tasks} setTasks={setTasks} />;
}
