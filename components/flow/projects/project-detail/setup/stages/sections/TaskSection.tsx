"use client";

import React, { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

export default function TaskSection({
  code,
  title,
  isOpen,
  onToggle,
  children,
  totalWeight,
  onTitleChange,
  onWeightChange,
}: {
  code: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  totalWeight: number;
  onTitleChange?: (newTitle: string) => void;
  onWeightChange?: (newWeight: number) => void;
}) {

  const safeWeight = useMemo(() => {
    if (Number.isNaN(totalWeight)) return 0;
    return totalWeight;
  }, [totalWeight]);

  const [localTitle, setLocalTitle] = React.useState(title);

  React.useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  const handleTitleCommit = () => {
    if (onTitleChange && localTitle !== title) {
      onTitleChange(localTitle);
    }
  };

  return (
    <div className={clsx(
      "rounded-2xl border transition-all duration-200 shadow-sm",
      isOpen
        ? "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 overflow-visible"
        : "bg-white dark:bg-neutral-900/90 border-neutral-200/80 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 overflow-hidden"
    )}>

      <div
        onClick={onToggle}
        className={clsx(
          "flex w-full items-center justify-between gap-4 px-5 py-3.5 cursor-pointer transition-colors group select-none rounded-t-2xl",
          isOpen ? "border-b border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/60 dark:bg-neutral-800/40" : ""
        )}
      >
        {/* LEFT: CODE + TITLE */}
        <div className="flex min-w-0 items-center gap-3.5 flex-1">
          <span className={clsx(
            "font-mono text-xs font-bold px-2.5 py-1 transition-all rounded-full flex items-center justify-center min-w-[32px] shadow-2xs",
            isOpen ? "bg-brand-red text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
          )}>
            {code.split("-").pop()}
          </span>

          {/* Editable Title */}
          <input
            type="text"
            value={localTitle}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleTitleCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            className="font-bold text-sm text-neutral-900 dark:text-white bg-transparent focus:bg-white dark:focus:bg-neutral-800 focus:ring-1 focus:ring-brand-red/20 rounded-lg px-2.5 py-1 w-full max-w-md transition-all focus:outline-none placeholder-neutral-400"
            placeholder="Section Name..."
          />
        </div>

        {/* RIGHT: META + CHEVRON */}
        <div className="flex items-center gap-4">
          <WeightInput
            weight={safeWeight}
            onChange={(val) => onWeightChange && onWeightChange(val)}
          />
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors">
            <ChevronDown
              className={clsx(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-180 text-brand-red"
              )}
            />
          </div>
        </div>
      </div>

      {/* CONTENT WRAPPER */}
      <div className={clsx("transition-all duration-300 ease-in-out", isOpen ? "block overflow-visible" : "hidden")}>
        <div className="p-5 pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}

interface WeightInputProps {
  weight: number;
  onChange: (newWeight: number) => void;
}

const WeightInput: React.FC<WeightInputProps> = ({ weight, onChange }) => {
  // Buffer input for smooth typing
  const [localValue, setLocalValue] = React.useState(weight.toFixed(2));

  // Sync with prop updates (e.g. from parent cascade)
  React.useEffect(() => {
    // Only update if not currently focused? No, we want to see live updates.
    // Ideally update only if significantly different to allow typing.
    // For now, simple sync is safer for consistency.
    setLocalValue(weight.toFixed(2));
  }, [weight]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleCommit = () => {
    const val = parseFloat(localValue);
    if (!isNaN(val)) {
      const rounded = Math.round(val * 100) / 100; // Round to 2 decimals for logic? No, keep float.
      onChange(val);
      setLocalValue(val.toFixed(2));
    } else {
      setLocalValue(weight.toFixed(2)); // Revert
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="number"
      value={localValue}
      onChange={handleChange}
      onBlur={handleCommit}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()} // Prevent parent div's onClick
      className="w-16 text-right text-sm font-medium text-neutral-700 bg-transparent focus:bg-white focus:ring-1 focus:ring-neutral-200 rounded px-1 transition-all focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      min="0"
      step="0.01"
    />
  );
};
