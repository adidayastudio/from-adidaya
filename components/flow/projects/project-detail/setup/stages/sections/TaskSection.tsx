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

  return (
    <div className={clsx("border-b border-neutral-100 last:border-0")}>
      <div
        onClick={onToggle}
        className={clsx(
          "flex w-full items-center justify-between gap-4 py-2 transition-colors hover:bg-neutral-50/50 group pr-2 cursor-pointer",
          isOpen ? "bg-neutral-50/30" : ""
        )}
      >
        {/* LEFT: CODE + TITLE */}
        <div className="flex min-w-0 items-center gap-3 flex-1 pl-2">
          <span className={clsx(
            "font-mono text-xs font-bold px-2 py-1 transition-all rounded-full flex items-center justify-center min-w-[28px]",
            isOpen ? "bg-red-600 text-white" : "bg-neutral-100 text-neutral-500"
          )}>
            {code.split("-").pop()}
          </span>

          {/* Editable Title */}
          <input
            type="text"
            value={title}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onTitleChange && onTitleChange(e.target.value)}
            className="font-medium text-sm text-neutral-900 bg-transparent focus:bg-white focus:ring-1 focus:ring-neutral-200 rounded px-1 -ml-1 w-full max-w-md transition-all focus:outline-none"
            placeholder="Section Name..."
          />
        </div>

        {/* RIGHT: META + CHEVRON */}
        <div className="flex items-center gap-4">
          <WeightInput
            weight={safeWeight}
            onChange={(val) => onWeightChange && onWeightChange(val)}
          />
          <ChevronDown
            className={clsx(
              "h-4 w-4 text-neutral-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </div>

      {/* CONTENT ANIMATION WRAPPER */}
      <div className={clsx("overflow-hidden transition-all duration-300 ease-in-out", isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0")}>
        <div className="pb-4 pt-0 pl-12 pr-0">
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
