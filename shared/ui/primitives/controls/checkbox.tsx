"use client";

import React from "react";

interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer text-body text-text-primary">
      <span className="relative inline-flex items-center justify-center">
        <input
          type="checkbox"
          className="peer sr-only"
          {...props}
        />

        {/* Box */}
        <span
          className="w-4 h-4 rounded-sm border border-border-light bg-white
                     peer-hover:border-border-default
                     peer-checked:bg-brand-red peer-checked:border-brand-red
                     peer-focus:ring-2 peer-focus:ring-brand-red/30
                     transition-all duration-150"
        />

        {/* Check Icon */}
        <svg
          className="pointer-events-none absolute w-3 h-3 text-white opacity-0 
                     peer-checked:opacity-100 transition-opacity"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M4 10.5L8 14L16 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {label && <span className="text-text-secondary">{label}</span>}
    </label>
  );
}
