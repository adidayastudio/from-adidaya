"use client";

import ActivityItem from "./ActivityItem";

export default function ActivityDraftList() {
  return (
    <div className="space-y-1">
      <ActivityItem
        type="doc"
        title="Daily Site Log: Wall Framing"
        context="WBS 4.2"
        tag="Site"
        time="Edited 10m ago"
        assignee="AL"
        status="not-started"
      />
      <ActivityItem
        type="alert"
        title="Reimbursement: Survey Transport"
        context="General"
        tag="Expense"
        time="Edited 1h ago"
        assignee="ME"
        status="not-started"
      />
    </div>
  );
}
