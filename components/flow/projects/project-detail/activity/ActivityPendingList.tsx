"use client";

import ActivityItem from "./ActivityItem";

export default function ActivityPendingList() {
  return (
    <div className="space-y-1">
      <ActivityItem
        type="doc"
        title="Purchase Request: 500 Bags Cement"
        context="RAB 2.1"
        tag="Procurement"
        time="Submitted Yesterday"
        assignee="Logistic"
        status="in-review"
      />
      <ActivityItem
        type="task"
        title="Variation Order: Extra Power Points"
        context="Design Change"
        tag="Design"
        time="Submitted 2 days ago"
        assignee="Client"
        status="need-revision"
      />
    </div>
  );
}
