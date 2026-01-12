import clsx from "clsx";
import { TableColumn, TableAction } from "./table.types";
import { TableCell } from "./TableCell";

export function TableRow<T>({
  row,
  columns,
  actions,
  onClick,
}: {
  row: T;
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
  onClick?: (row: T) => void;
}) {
  return (
    <tr
      className={clsx(
        "border-b border-neutral-100 hover:bg-neutral-50",
        onClick && "cursor-pointer"
      )}
      onClick={() => onClick?.(row)}
    >
      {columns.map((col) => (
        <TableCell key={col.key} column={col} row={row} />
      ))}

      <td className="px-2 text-right">
        {actions && actions.length > 0 && (
          <button className="text-neutral-400 hover:text-neutral-600">
            •••
          </button>
        )}
      </td>
    </tr>
  );
}
