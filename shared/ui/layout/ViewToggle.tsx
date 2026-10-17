"use client";

import React from "react";
import clsx from "clsx";

export type ViewOption<T extends string> = {
    value: T;
    label: string; // Used for tooltip/title
    icon: React.ReactNode;
};

type ViewToggleProps<T extends string> = {
    value: T;
    onChange: (value: T) => void;
    options: ViewOption<T>[];
    className?: string;
};

export function ViewToggle<T extends string>({ value, onChange, options, className }: ViewToggleProps<T>) {
    return (
        <div className={clsx("flex items-center p-1 bg-neutral-100 rounded-full shrink-0", className)}>
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={clsx(
                        "p-1.5 rounded-full transition-all",
                        value === option.value
                            ? "bg-white text-neutral-900 shadow-sm"
                            : "text-neutral-500 hover:text-neutral-900"
                    )}
                    title={option.label}
                    type="button"
                >
                    {option.icon}
                </button>
            ))}
        </div>
    );
}
