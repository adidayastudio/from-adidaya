"use client";

import React from "react";
import clsx from "clsx";

export type TabItem<T extends string = string> = {
  key: T;
  label: React.ReactNode;
};

type TabsProps<T extends string = string> = {
  value: T;
  items: TabItem<T>[];
  onChange: (v: T) => void;
  className?: string; // Add className prop
};

export function Tabs<T extends string>({
  value,
  items,
  onChange,
  className,
}: TabsProps<T>) {
  return (
    <div className={clsx("flex gap-6", className)}>
      {items.map((item) => {
        const active = item.key === value;

        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={clsx(
              "relative h-9 flex items-center justify-center text-sm transition px-1",
              active
                ? "font-medium text-neutral-900"
                : "text-neutral-500 hover:text-neutral-900"
            )}
          >
            {item.label}
            {active && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-red" />
            )}
          </button>
        );
      })}
    </div>
  );
}
