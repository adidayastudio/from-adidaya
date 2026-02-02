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
  className?: string;
  activeColor?: "red" | "blue" | "emerald";
};

export function Tabs<T extends string>({
  value,
  items,
  onChange,
  className,
  activeColor = "red",
}: TabsProps<T>) {
  const tabsRef = React.useRef<Map<string, HTMLButtonElement>>(new Map());

  React.useEffect(() => {
    const activeTab = tabsRef.current.get(value);
    if (activeTab) {
      activeTab.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [value]);

  return (
    <div className={clsx("flex gap-6 flex-nowrap", className)}>
      {items.map((item) => {
        const active = item.key === value;

        return (
          <button
            key={item.key}
            ref={(el) => {
              if (el) tabsRef.current.set(item.key, el);
              else tabsRef.current.delete(item.key);
            }}
            onClick={() => onChange(item.key)}
            className={clsx(
              "relative h-9 flex items-center justify-center text-sm transition px-1 whitespace-nowrap shrink-0",
              active
                ? "font-medium text-neutral-900"
                : "text-neutral-500 hover:text-neutral-900"
            )}
          >
            {item.label}
            {active && (
              <span className={
                clsx(
                  "absolute inset-x-0 -bottom-px h-0.5",
                  activeColor === "red" && "bg-brand-red",
                  activeColor === "blue" && "bg-blue-600",
                  activeColor === "emerald" && "bg-emerald-600"
                )} />
            )}
          </button>
        );
      })}
    </div>
  );
}
