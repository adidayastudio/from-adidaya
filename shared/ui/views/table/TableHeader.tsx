import { TableColumn } from "./table.types";

export function TableHeader<T>({
  columns,
}: {
  columns: TableColumn<T>[];
}) {
  return (
    <thead className="bg-neutral-50 border-b border-neutral-200">
      <tr>
        {columns.map((col) => (
          <th
            key={col.key}
            className="px-3 py-2 text-left text-xs font-medium text-neutral-500"
            style={{ width: col.width }}
          >
            {col.header}
          </th>
        ))}
        <th className="w-8" />
      </tr>
    </thead>
  );
}
