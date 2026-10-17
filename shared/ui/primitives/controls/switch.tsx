"use client";

import React from "react";
import clsx from "clsx";

interface SwitchProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  label?: string;
}

export function Switch({ checked, label, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      className={clsx("inline-flex items-center gap-2", className)}
      {...props}
    >
      {/* Track */}
      <span
        className={clsx(
          "relative w-9 h-5 rounded-full transition-colors duration-150 border border-border-light",
          checked ? "bg-brand-red border-brand-red" : "bg-bg-200"
        )}
      >
        {/* Knob */}
        <span
          className={clsx(
            "absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow-card transition-transform duration-150",
            checked && "translate-x-4"
          )}
        />
      </span>

      {label && (
        <span className="text-small text-text-secondary">{label}</span>
      )}
    </button>
  );
}
