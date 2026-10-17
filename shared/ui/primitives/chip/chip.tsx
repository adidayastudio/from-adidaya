"use client";

import React from "react";
import clsx from "clsx";

type ChipVariant = "default" | "outline" | "selected";

interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  variant?: ChipVariant;
  removable?: boolean;
  onRemove?: () => void;
}

export function Chip({
  label,
  variant = "default",
  removable,
  onRemove,
  className,
  ...props
}: ChipProps) {
  const variants: Record<ChipVariant, string> = {
    default:
      // Soft background, low contrast, seperti Notion tags
      "bg-white text-text-primary-light border border-border-light shadow-sm",

    outline:
      // Transparan, border tipis, text gelap
      "bg-transparent border border-border-default text-text-primary-light",

    selected:
      // Dominan tetapi tetap soft dalam light mode
      "bg-brand-red-soft/15 border border-brand-red text-brand-red font-medium",
  };

  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 px-3 py-1 rounded-pill text-small transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      <span>{label}</span>

      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="text-text-secondary hover:text-brand-red"
        >
          ×
        </button>
      )}
    </div>
  );
}
