"use client";

import clsx from "clsx";

export function RadioItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition",
        active
          ? "bg-brand-red/10 text-brand-red font-medium"
          : "text-neutral-700 hover:bg-brand-red/5 hover:text-brand-red"
      )}
    >
      <span
        className={clsx(
          "h-3 w-3 rounded-full border",
          active
            ? "border-brand-red bg-brand-red"
            : "border-neutral-300"
        )}
      />
      {label}
    </div>
  );
}
