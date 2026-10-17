"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { StatusBadge } from "./meta/StatusBadge";

export type Status =
  | "Not Started"
  | "In Progress"
  | "On Hold"
  | "For Review"
  | "Waiting Approval"
  | "Completed";

export function StatusSelect({
  value,
  onChange,
}: {
  value: Status;
  onChange: (v: Status) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const options: Status[] = useMemo(
    () => [
      "Not Started",
      "In Progress",
      "On Hold",
      "For Review",
      "Waiting Approval",
      "Completed",
    ],
    []
  );

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-2 rounded-full border px-3 py-0.5 text-xs hover:bg-neutral-50"
      >
        <StatusBadge status={value} />
        <span className="text-neutral-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border bg-white shadow-lg overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={clsx(
                "w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-neutral-50",
                opt === value && "font-semibold text-brand-red"
              )}
            >
              <StatusBadge status={opt} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
