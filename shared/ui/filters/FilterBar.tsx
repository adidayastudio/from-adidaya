"use client";

import { FilterChip } from "./FilterChip";

export type FilterState = {
  status?: string;
  priority?: string;
  project?: string;
};

export function FilterBar({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* STATUS */}
      <FilterChip
        label="All"
        active={!filters.status}
        onClick={() => onChange({ ...filters, status: undefined })}
      />

      {["Not Started", "In Progress", "Completed"].map((s) => (
        <FilterChip
          key={s}
          label={s}
          active={filters.status === s}
          onClick={() => onChange({ ...filters, status: s })}
        />
      ))}

      <span className="mx-2 h-4 w-px bg-neutral-200" />

      {/* PRIORITY */}
      {["Urgent", "High", "Medium", "Low"].map((p) => (
        <FilterChip
          key={p}
          label={p}
          active={filters.priority === p}
          onClick={() => onChange({ ...filters, priority: p })}
        />
      ))}
    </div>
  );
}
