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

interface SelectProps {
  label?: string;
  helperText?: string;
  error?: string;
  name?: string;
  variant?: SelectVariant;
  selectSize?: SelectSize;
  options: Option[];
  value?: string; // controlled
  defaultValue?: string; // uncontrolled
  disabled?: boolean;
  onChange?: (value: string) => void;
  className?: string;
  accentColor?: "red" | "blue";
  placeholder?: string;
}

export function Select({
  label,
  helperText,
  error,
  name,
  variant = "default",
  selectSize = "md",
  options,
  value,
  defaultValue,
  disabled,
  onChange,
  className,
  placeholder = "Select...",
  accentColor = "red",
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(
    defaultValue ?? options[0]?.value ?? ""
  );

  // Keyboard navigation state
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const currentValue = value ?? internalValue;
  const selected = options.find((o) => o.value === currentValue);

  const handleSelect = (val: string) => {
    if (value === undefined) {
      setInternalValue(val);
    }
    onChange?.(val);
    setIsOpen(false);
    triggerRef.current?.focus(); // Return focus to trigger
  };

  // Reset highlighted index when opening
  React.useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((o) => o.value === currentValue);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, currentValue, options]);

  // Handle keyboard interaction
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (isOpen) {
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            handleSelect(options[highlightedIndex].value);
          }
        } else {
          setIsOpen(true);
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : options.length - 1
          );
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  // Click outside to close
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── STYLES ──────────────────────────────────────────────

  const base =
    "w-full rounded-lg border bg-white text-neutral-900 transition-all duration-150 outline-none";

  const focusStyles = accentColor === "blue"
    ? "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
    : "focus:border-red-500 focus:ring-2 focus:ring-red-500/30";

  const variants: Record<SelectVariant, string> = {
    default: clsx("border-neutral-200 hover:border-neutral-300", focusStyles),
    filled: clsx("bg-neutral-50 border-neutral-200 hover:border-neutral-300", focusStyles),
  };

  const sizes: Record<SelectSize, string> = {
    sm: "pl-3 pr-8 h-8 text-xs",
    md: "pl-3 pr-8 h-9 text-sm",
    lg: "pl-4 pr-10 h-10 text-sm",
  };

  const errorStyles = error ? (accentColor === "blue" ? "border-red-500 text-red-600 focus:ring-red-500/30" : "border-red-500 text-red-600 focus:ring-red-500/30") : "";

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Trigger pill */}
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          className={clsx(
            base,
            variants[variant],
            sizes[selectSize],
            "flex items-center justify-between cursor-pointer",
            disabled && "opacity-60 cursor-not-allowed",
            errorStyles,
            className
          )}
          onClick={() => !disabled && setIsOpen((open) => !open)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={clsx("truncate", !selected && "text-neutral-400")}>
            {selected?.label ?? placeholder}
          </span>

          {/* Chevron */}
          <span
            className={clsx(
              "absolute right-3 pointer-events-none text-text-secondary transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          >
            <ChevronDown size={16} strokeWidth={2} />
          </span>
        </button>

        {/* Dropdown menu */}
        {isOpen && !disabled && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-border-light bg-white shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <ul
              className="max-h-60 overflow-y-auto py-1"
              role="listbox"
              tabIndex={-1}
            >
              {options.map((opt, index) => {
                const isSelected = opt.value === currentValue;
                const isHighlighted = index === highlightedIndex;

                const highlightClass = accentColor === "blue"
                  ? "bg-blue-50 text-neutral-900"
                  : "bg-red-50 text-neutral-900";

                const selectedClass = accentColor === "blue"
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "bg-red-100 text-red-700 font-medium";

                const normalClass = accentColor === "blue"
                  ? "text-neutral-600 hover:bg-blue-50 hover:text-neutral-900"
                  : "text-neutral-600 hover:bg-red-50 hover:text-neutral-900";

                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    className={clsx(
                      "w-full text-left px-4 py-2 text-body transition-colors cursor-pointer",
                      isHighlighted && highlightClass,
                      isSelected && selectedClass,
                      !isHighlighted && !isSelected && normalClass
                    )}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {opt.label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Hidden native select (for form submission) */}
        <select
          name={name}
          value={currentValue}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={() => { }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Helper / error */}
      {error ? (
        <p className="text-small text-action-danger">{error}</p>
      ) : helperText ? (
        <p className="text-small text-text-muted">{helperText}</p>
      ) : null}
    </div>
  );
}
