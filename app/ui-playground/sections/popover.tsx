"use client";

import {
  PopoverRoot,
  PopoverTrigger,
  PopoverContent,
} from "@/shared/ui/popover";

export default function PopoverPlayground() {
  return (
    <PopoverRoot>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-md border px-4 py-2"
        >
          Test Popover
        </button>
      </PopoverTrigger>

      <PopoverContent>
        <div className="p-4 text-sm">
          🚀 Popover works
        </div>
      </PopoverContent>
    </PopoverRoot>
  );
}
