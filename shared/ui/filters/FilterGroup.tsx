"use client";

import { RadioItem } from "./RadioItem";

export function FilterGroup<T extends string>({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
        {title}
      </div>

      {options.map((opt) => (
        <RadioItem
          key={opt.value}
          label={opt.label}
          active={value === opt.value}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </div>
  );
}
