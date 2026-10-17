"use client";

import { useRouter, useParams } from "next/navigation";

/* ================================
   TYPES
================================ */

type AlertCategory =
  | "schedule"
  | "cost"
  | "task"
  | "approval";

type AlertLevel = "info" | "warning" | "danger";

type AlertType =
  | "schedule_delay"
  | "cost_overrun"
  | "task_overdue"
  | "approval_pending";

type ProjectAlert = {
  id: string;
  category: AlertCategory;
  type: AlertType;
  level: AlertLevel;
  severityScore: number;
  data: Record<string, number | string>;
};

/* ================================
   DUMMY DATA (SIMULASI ENGINE)
================================ */

const RAW_ALERTS: ProjectAlert[] = [
  {
    id: "schedule-1",
    category: "schedule",
    type: "schedule_delay",
    level: "danger",
    severityScore: 10.1,
    data: {
      delayPercent: 11.8,
    },
  },
  {
    id: "cost-1",
    category: "cost",
    type: "cost_overrun",
    level: "warning",
    severityScore: 4.2,
    data: {
      overrunPercent: 8.4,
    },
  },
  {
    id: "task-1",
    category: "task",
    type: "task_overdue",
    level: "warning",
    severityScore: 3.6,
    data: {
      count: 3,
      days: 2,
    },
  },
  {
    id: "approval-1",
    category: "approval",
    type: "approval_pending",
    level: "info",
    severityScore: 2.1,
    data: {
      days: 6,
    },
  },
];

/* ================================
   SELECTION LOGIC
================================ */

function selectTopAlerts(
  alerts: ProjectAlert[],
  max = 3
) {
  const byCategory = new Map<
    AlertCategory,
    ProjectAlert
  >();

  // 1️⃣ ambil alert TERPARAH per kategori
  for (const alert of alerts) {
    const existing = byCategory.get(alert.category);
    if (
      !existing ||
      alert.severityScore >
      existing.severityScore
    ) {
      byCategory.set(alert.category, alert);
    }
  }

  // 2️⃣ urutkan & batasi jumlah
  return Array.from(byCategory.values())
    .sort(
      (a, b) =>
        b.severityScore - a.severityScore
    )
    .slice(0, max);
}

/* ================================
   ALERT TEMPLATES
================================ */

const ALERT_TEMPLATES: Record<
  AlertType,
  (data: ProjectAlert["data"]) => React.ReactNode
> = {
  schedule_delay: (data) => (
    <>
      Schedule delayed by{" "}
      <Highlight level="danger">
        {data.delayPercent}%
      </Highlight>
    </>
  ),

  cost_overrun: (data) => (
    <>
      Cost exceeded expected by{" "}
      <Highlight level="warning">
        {data.overrunPercent}%
      </Highlight>{" "}
      relative to progress
    </>
  ),

  task_overdue: (data) => (
    <>
      <Highlight level="warning">
        {data.count} critical tasks
      </Highlight>{" "}
      overdue for more than {data.days} days
    </>
  ),

  approval_pending: (data) => (
    <>
      Client approval pending for{" "}
      <Highlight level="info">
        {data.days} working days
      </Highlight>
    </>
  ),
};

/* ================================
   MAIN PANEL
================================ */

export default function AlertsPanel() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const alerts = selectTopAlerts(RAW_ALERTS);

  const handleAlertClick = (category: AlertCategory) => {
    let path = "";
    switch (category) {
      case "schedule": path = "setup/schedule"; break;
      case "cost": path = "setup/rab"; break;
      case "task": path = "tracking"; break;
      case "approval": path = "docs"; break;
      default: path = "tracking";
    }
    router.push(`/flow/projects/${projectId}/${path}`);
  };

  return (
    <div className="">


      {alerts.length === 0 ? (
        <div className="text-sm text-neutral-500">
          No alerts. Project is progressing within
          expected parameters.
        </div>
      ) : (
        <ul className="space-y-3 text-sm">
          {alerts.map((alert) => (
            <AlertItem
              key={alert.id}
              level={alert.level}
              onClick={() => handleAlertClick(alert.category)}
            >
              {
                ALERT_TEMPLATES[
                  alert.type
                ](alert.data)
              }
            </AlertItem>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ================================
   ALERT ITEM
================================ */

function AlertItem({
  level,
  children,
  onClick,
}: {
  level: AlertLevel;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const dot =
    level === "danger"
      ? "bg-red-500"
      : level === "warning"
        ? "bg-amber-500"
        : "bg-blue-500";

  return (
    <li
      onClick={onClick}
      className={`flex items-start gap-3 rounded-lg p-2 -mx-2 transition-colors ${onClick ? "cursor-pointer hover:bg-neutral-50" : ""}`}
    >
      <span
        className={`mt-1.5 h-2.5 w-2.5 rounded-full ${dot} shrink-0`}
      />
      <span className="text-neutral-700 leading-relaxed">
        {children}
      </span>
    </li>
  );
}

/* ================================
   HIGHLIGHT ATOM
================================ */

function Highlight({
  level,
  children,
}: {
  level: AlertLevel;
  children: React.ReactNode;
}) {
  const color =
    level === "danger"
      ? "text-red-600"
      : level === "warning"
        ? "text-amber-600"
        : "text-blue-600";

  return (
    <span className={`font-semibold ${color}`}>
      {children}
    </span>
  );
}
