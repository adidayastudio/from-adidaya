"use client";

import ActivityItem from "./ActivityItem";

export default function ActivityAssignedTasks() {
  return (
    <div className="space-y-1">
      <ActivityItem
        type="task"
        title="Finalize Schematic Design"
        context="Stage 02-SD"
        tag="Design"
        time="Due Today"
        assignee="ME"
        status="in-progress"
      />
      <ActivityItem
        type="task"
        title="Verify Foundation Progress"
        context="WBS 3.1"
        tag="Site"
        time="Due Tomorrow"
        assignee="ME"
        status="not-started"
      />
    </div>
  );
}
