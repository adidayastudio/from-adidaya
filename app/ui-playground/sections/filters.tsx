"use client";

import { useState } from "react";
import { FilterBar, FilterState } from "@/shared/ui/filters/FilterBar";

export default function FiltersPlayground() {
  const [filters, setFilters] = useState<FilterState>({});

  return (
    <div className="space-y-4 p-6 border rounded-xl">
      <div className="text-sm font-medium text-neutral-700">
        Active filters:
      </div>

      <pre className="text-xs bg-neutral-50 p-3 rounded">
        {JSON.stringify(filters, null, 2)}
      </pre>

      <FilterBar
        filters={filters}
        onChange={setFilters}
      />
    </div>
  );
}
