import { TableColumn } from "./table.types";

export function TableCell<T>({
  column,
  row,
}: {
  column: TableColumn<T>;
  row: T;
}) {
  const value = column.accessor
    ? column.accessor(row)
    : (row as any)[column.key];

  return (
    <td className="px-3 py-2 align-middle">
      {column.render
        ? column.render(value, row)
        : <span>{String(value ?? "")}</span>}
    </td>
  );
}
