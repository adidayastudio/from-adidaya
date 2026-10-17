import clsx from "clsx";
import { Status } from "../StatusSelect";

export function StatusBadge({
  status,
  showLabel = true, // ⬅️ NEW
}: {
  status: Status;
  showLabel?: boolean;
}) {
  const map: Record<Status, string> = {
    "Not Started": "bg-neutral-400",
    "In Progress": "bg-blue-500",
    "On Hold": "bg-orange-500",
    "For Review": "bg-yellow-500",
    "Waiting Approval": "bg-purple-500",
    Completed: "bg-green-500",
  };

  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span className={clsx("h-1.5 w-1.5 rounded-full", map[status])} />
      {showLabel && <span>{status}</span>}
    </span>
  );
}
