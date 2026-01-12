"use client";

import { useState } from "react";
import { CalendarView } from "@/shared/ui/views/calendar/CalendarView";
import { CalendarTask } from "@/shared/ui/views/calendar/calendar.types";

export default function CalendarViewPlayground() {
  const [tasks, setTasks] = useState<CalendarTask[]>([
    {
      id: "t1",
      title: "Update Layout Gym Lt.2",
      dateISO: "2025-12-14",
      status: "In Progress",
    },
    {
      id: "t2",
      title: "Upload Minutes of Meeting",
      dateISO: "2025-12-14",
      status: "Waiting Approval",
    },
    {
      id: "t3",
      title: "Review Struktur Atap",
      dateISO: "2025-12-18",
      status: "For Review",
    },
    {
      id: "t4",
      title: "Monthly Report Submission",
      dateISO: "2025-12-31",
      status: "Not Started",
    },
  ]);

  return <CalendarView tasks={tasks} setTasks={setTasks} />;
}
