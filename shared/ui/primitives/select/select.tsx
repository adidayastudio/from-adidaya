"use client";

import React from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";

type SelectVariant = "default" | "filled";
type SelectSize = "sm" | "md" | "lg";

interface Option {
  label: string;
  value: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size' | 'value'> {
  label?: string;
  helperText?: string;
  error?: string;
  variant?: SelectVariant;
  selectSize?: SelectSize;
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  accentColor?: "red" | "blue";
  placeholder?: string;
  // searchable prop is ignored in native select implementation but kept for compatibility
  searchable?: boolean;
}

export function Select({
  label,
  helperText,
  error,
  variant = "default",
  selectSize = "md",
  options,
  value,
  disabled,
  onChange,
  className,
  placeholder = "Select...",
  accentColor = "red",
  searchable, // ignored
  ...props
}: SelectProps) {

  // Styles
  const base =
    "w-full appearance-none rounded-lg border bg-white text-neutral-900 transition-all duration-150 outline-none";

  const focusStyles = accentColor === "blue"
    ? "!focus:border-blue-500/20 !focus:ring-4 !focus:ring-blue-500/[0.08]"
    : "!focus:border-red-500/20 !focus:ring-4 !focus:ring-red-500/[0.08]";

  const variants: Record<SelectVariant, string> = {
    default: clsx("border-neutral-200 hover:border-neutral-300", focusStyles),
    filled: clsx("bg-neutral-50 border-neutral-200 hover:border-neutral-300", focusStyles),
  };

  const sizes: Record<SelectSize, string> = {
    sm: "pl-3 pr-8 h-8 text-xs",
    md: "pl-3 pr-8 h-9 text-base md:text-sm", // Native size logic
    lg: "pl-4 pr-10 h-10 text-base md:text-sm",
  };

  const errorStyles = error ? (accentColor === "blue" ? "border-red-500 text-red-600 focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20" : "border-red-500 text-red-600 focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20") : "";

  return (
    <div className="flex flex-col gap-1.5" >
      {label && (
        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={clsx(
            base,
            variants[variant],
            sizes[selectSize],
            "cursor-pointer",
            disabled && "opacity-60 cursor-not-allowed",
            value === "" && "text-neutral-400", // Placeholder style
            errorStyles,
            className
          )}
          {...props}
        >
          <option value="" disabled className="text-neutral-400">
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Chevron Icon - Pointer events none ensures clicks go through to select */}
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400"
        >
          <ChevronDown size={16} strokeWidth={2} />
        </span>
      </div>

      {/* Helper / error */}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-neutral-500">{helperText}</p>
      ) : null}
    </div>
  );
}
