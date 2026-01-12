"use client";

import React from "react";
import clsx from "clsx";
import { ButtonVariant, ButtonSize } from "./types";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconOnly?: React.ReactNode;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconOnly,
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const base =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 whitespace-nowrap shrink-0";

  // Standardized sizes - consistent height across all buttons
  const sizes: Record<ButtonSize, string> = {
    sm: "text-xs h-8 px-3 gap-1.5",
    md: "text-sm h-9 px-4 gap-2",
    lg: "text-sm h-10 px-5 gap-2",
  };

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-action-primary text-white border border-action-primary " +
      "hover:bg-action-primary-hover active:bg-action-primary-pressed",

    secondary:
      "bg-white text-neutral-700 border border-neutral-200 " +
      "hover:bg-neutral-50 active:bg-neutral-100",

    outline:
      "bg-transparent text-neutral-700 border border-neutral-300 " +
      "hover:bg-neutral-50 active:bg-neutral-100",

    text:
      "bg-transparent text-neutral-600 px-2 " +
      "hover:text-neutral-900 hover:bg-neutral-100",

    danger:
      "bg-red-500 text-white border border-red-500 " +
      "hover:bg-red-600 active:bg-red-700",

    icon:
      "bg-neutral-100 text-neutral-600 p-2 rounded-lg " +
      "hover:bg-neutral-200 active:bg-neutral-300",
  };

  const disabledStyle =
    "opacity-45 cursor-not-allowed hover:bg-inherit hover:text-inherit";

  return (
    <button
      type="button"
      disabled={isDisabled}
      className={clsx(
        base,
        sizes[size],
        variants[variant],
        isDisabled && disabledStyle,
        className
      )}
      {...props}
    >
      {/* icon only */}
      {iconOnly && <span className="w-4 h-4 flex items-center justify-center">{iconOnly}</span>}

      {/* icon + label */}
      {!iconOnly && icon && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}

      {!iconOnly && <span>{children}</span>}

      {/* loading indicator */}
      {loading && (
        <span
          aria-hidden="true"
          className="ml-1 inline-block w-3 h-3 rounded-full border-2 border-t-transparent border-current animate-spin"
        />
      )}
    </button>
  );
}
