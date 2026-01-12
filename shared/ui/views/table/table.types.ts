import React from "react";

export type TableColumn<T> = {
  key: string;
  header: string;
  width?: number | string;
  align?: "left" | "center" | "right";

  accessor?: (row: T) => any;

  render?: (value: any, row: T) => React.ReactNode;

  sortable?: boolean;
};

export type TableAction<T> = {
  label: string;
  onClick: (row: T) => void;
};

export type TableRowData = {
  id: string;
};

export type TableProps<T extends TableRowData> = {
  columns: TableColumn<T>[];
  rows: T[];
  actions?: TableAction<T>[];
  onRowClick?: (row: T) => void;
};
