"use client";

import React from "react";
import clsx from "clsx";
import { InputVariant, InputSize } from "../../primitives/input/types";

type SearchBarProps = React.InputHTMLAttributes<HTMLInputElement> & {
  variant?: InputVariant;
  inputSize?: InputSize;
  error?: string;
};

export function SearchBar({
  variant = "default",
  inputSize = "md",
  error,
  className,
  ...props
}: SearchBarProps) {
  const base =
    "w-full flex items-center rounded-xl transition-all duration-150 border text-body bg-white shadow-sm";

  const variants: Record<InputVariant, string> = {
    default:
      "border-gray-300 hover:bg-gray-50 focus-within:border-brand-red",
    filled:
      "bg-gray-100 border-gray-200 hover:bg-gray-200 focus-within:border-brand-red",
    subtle:
      "border-transparent bg-gray-50 hover:bg-gray-100 focus-within:border-brand-red",
  };

  const sizes: Record<InputSize, string> = {
    sm: "px-3 py-2 text-sm gap-2",
    md: "px-4 py-2.5 gap-2.5 text-base",
    lg: "px-5 py-3 gap-3 text-base",
  };

  const showClear =
    typeof props.value === "string" &&
    props.value.length > 0 &&
    !!props.onChange;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={clsx(
          base,
          variants[variant],
          sizes[inputSize],
          error && "border-red-400 text-red-500",
          className
        )}
      >
        {/* Search Icon */}
        <span className="text-gray-400">
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="6" />
            <line x1="16" y1="16" x2="21" y2="21" />
          </svg>
        </span>

        {/* Input */}
        <input
          className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-400"
          {...props}
        />

        {/* Clear Button */}
        {showClear && (
          <button
            type="button"
            onClick={() => {
              props.onChange?.({
                target: { value: "" },
              } as React.ChangeEvent<HTMLInputElement>);
            }}
            className="text-gray-400 hover:text-gray-600 transition text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
