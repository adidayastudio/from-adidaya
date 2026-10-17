"use client";

import ActivityItem from "./ActivityItem";

export default function ActivityApprovedList() {
  return (
    <div className="space-y-1">
      <ActivityItem
        type="doc"
        title="Material: Granite Tiles 60x60"
        context="RAB 3.5"
        tag="Procurement"
        time="Approved Today"
        assignee="PM"
        status="approved"
      />
      <ActivityItem
        type="doc"
        title="Reimbursement: Team Lunch"
        context="Site Visit"
        tag="Expense"
        time="Paid Yesterday"
        assignee="Finance"
        status="approved"
      />
    </div>
  );
}
