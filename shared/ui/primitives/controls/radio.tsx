"use client";

import React from "react";

interface RadioProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Radio({ label, ...props }: RadioProps) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer text-body text-text-primary">
      <span className="relative inline-flex items-center justify-center">
        <input type="radio" className="peer sr-only" {...props} />

        {/* Outer circle */}
        <span
          className="w-4 h-4 rounded-full border border-border-light bg-white
                     peer-hover:border-border-default
                     peer-checked:border-brand-red
                     peer-focus:ring-2 peer-focus:ring-brand-red/30
                     transition-all duration-150"
        />

        {/* Inner dot */}
        <span
          className="absolute w-2 h-2 rounded-full bg-brand-red 
                     opacity-0 peer-checked:opacity-100 transition-opacity"
        />
      </span>

      {label && <span className="text-text-secondary">{label}</span>}
    </label>
  );
}
