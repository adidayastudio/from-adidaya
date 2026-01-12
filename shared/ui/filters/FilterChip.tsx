"use client";

import clsx from "clsx";

export function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-full px-3 py-1 text-xs font-medium border transition",
        active
          ? "bg-brand-red/10 text-brand-red border-brand-red/30"
          : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
      )}
    >
      {label}
    </button>
  );
}
