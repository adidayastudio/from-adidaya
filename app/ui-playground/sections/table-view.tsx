"use client";

import { TableView } from "@/shared/ui/views/table/TableView";
import { TableColumn } from "@/shared/ui/views/table/table.types";

type TaskRow = {
  id: string;
  code: string;
  title: string;
  project: string;
  status: string;
  due: string;
};

export default function TableViewPlayground() {
  const columns: TableColumn<TaskRow>[] = [
    { key: "code", header: "Code", width: 80 },
    { key: "title", header: "Title" },
    { key: "project", header: "Project" },
    {
      key: "status",
      header: "Status",
      render: (v) => (
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">
          {v}
        </span>
      ),
    },
    { key: "due", header: "Due" },
  ];

  const rows: TaskRow[] = [
    {
      id: "1",
      code: "TSK-001",
      title: "Update Layout Gym Lt.2",
      project: "Precision Gym",
      status: "In Progress",
      due: "Today",
    },
    {
      id: "2",
      code: "TSK-002",
      title: "Upload Minutes of Meeting",
      project: "Padel JPF",
      status: "Waiting Approval",
      due: "Tomorrow",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Table View</h2>

      <TableView
        columns={columns}
        rows={rows}
        onRowClick={(row) => console.log("Row click", row)}
      />
    </div>
  );
}
