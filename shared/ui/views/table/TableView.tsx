"use client";

import clsx from "clsx";
import { TableProps } from "./table.types";
import { TableHeader } from "./TableHeader";
import { TableRow } from "./TableRow";

export function TableView<T extends { id: string }>({
  columns,
  rows,
  actions,
  onRowClick,
}: TableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <table className="w-full border-collapse text-sm">
        <TableHeader columns={columns} />

        <tbody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              row={row}
              columns={columns}
              actions={actions}
              onClick={onRowClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
