"use client";

import React from "react";
import clsx from "clsx";

interface StandardPillGroupProps {
  children: React.ReactNode;
  className?: string;
  isVibeActive?: boolean;
}

export default function StandardPillGroup({
  children,
  className,
  isVibeActive = false,
}: StandardPillGroupProps) {
  return (
    <div
      className={clsx(
        "h-9 w-9 flex items-center justify-center rounded-full border shadow-sm pointer-events-auto transition-all duration-500",
        isVibeActive
          ? "bg-white/10 dark:bg-black/10 border-white/10 dark:border-white/5 backdrop-blur-md"
          : "bg-white/10 dark:bg-neutral-800/10 border-white/20 dark:border-neutral-700/20 backdrop-blur-xl",
        className
      )}
    >
      {children}
    </div>
  );
}
