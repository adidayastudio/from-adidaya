"use client";

import { useState } from "react";
import { TimelineView } from "@/shared/ui/views/timeline/TimelineView";
import { TimelineTask } from "@/shared/ui/views/timeline/timeline.types";

export default function TimelinePlayground() {
  const ws = new Date();
  const [tasks, setTasks] = useState<TimelineTask[]>([
    {
      id: "1",
      title: "Update Layout Gym Lt.2",
      project: "Precision Gym",
      startDate: "2025-12-16",
      endDate: "2025-12-18",
      status: "In Progress",
      priority: "High",
    },
    {
      id: "2",
      title: "Upload MoM",
      project: "Padel JPF",
      startDate: "2025-12-19",
      endDate: "2025-12-20",
      status: "Waiting Approval",
    },
  ]);

  return <TimelineView tasks={tasks} setTasks={setTasks} />;
}
