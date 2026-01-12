"use client";

import React from "react";
import clsx from "clsx";
import { InputVariant, InputSize } from "./types";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  variant?: InputVariant;
  inputSize?: InputSize;
  label?: string;
  helperText?: string;
  error?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
};

export function Input({
  variant = "default",
  inputSize = "md",
  label,
  helperText,
  error,
  iconLeft,
  iconRight,
  className,
  ...props
}: InputProps) {
  const base =
    "w-full flex items-center rounded-lg transition-all duration-150 border bg-white text-body";

  const variants: Record<InputVariant, string> = {
    default:
      "border-neutral-200 hover:border-neutral-300 focus-within:border-red-500 focus-within:outline-none focus-within:ring-0",
    filled:
      "bg-neutral-50 border-neutral-200 hover:border-neutral-300 focus-within:border-red-500 focus-within:outline-none focus-within:ring-0",
    subtle:
      "bg-neutral-50 border-neutral-200 hover:border-neutral-300 focus-within:border-red-500 focus-within:outline-none focus-within:ring-0",
  };

  // Fixed heights to match Button component
  const sizes: Record<InputSize, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-3 text-sm", // Adjusted to h-9 and px-3 for consistnecy
    lg: "h-10 px-4 text-sm",
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          {label}
        </label>
      )}

      <div
        className={clsx(
          base,
          variants[variant],
          sizes[inputSize],
          error &&
          "border-red-500 text-red-600 focus-within:border-red-500",
          className
        )}
      >
        {iconLeft && (
          <span className="mr-2 text-gray-400 flex-shrink-0">
            {iconLeft}
          </span>
        )}

        <input
          className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-400"
          {...props}
        />

        {iconRight && (
          <span className="ml-2 text-gray-400 flex-shrink-0">
            {iconRight}
          </span>
        )}
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : helperText ? (
        <p className="text-sm text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
}
