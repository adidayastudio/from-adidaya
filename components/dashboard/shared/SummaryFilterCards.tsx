import React from "react";
import clsx from "clsx";

export interface FilterItem {
    id: string;
    label: string;
    count: number | string;
    color?: "blue" | "red" | "green" | "neutral" | "orange" | "purple";
}

interface SummaryFilterCardsProps {
    items: FilterItem[];
    selectedId: string;
    onSelect: (id: string) => void;
    className?: string;
}

export function SummaryFilterCards({ items, selectedId, onSelect, className }: SummaryFilterCardsProps) {
    return (
        <div className={clsx("grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4", className)}>
            {items.map((item) => {
                const isSelected = selectedId === item.id;

                // Define color styles based on selection state and item color
                let cardStyle = "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300";
                let countStyle = "text-neutral-900";
                let labelStyle = "text-neutral-500";

                if (isSelected) {
                    switch (item.color) {
                        case "blue":
                            cardStyle = "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 ring-2 ring-blue-100 ring-offset-1";
                            countStyle = "text-white";
                            labelStyle = "text-blue-100";
                            break;
                        case "red":
                            cardStyle = "bg-red-600 border-red-600 text-white shadow-lg shadow-red-200 ring-2 ring-red-100 ring-offset-1";
                            countStyle = "text-white";
                            labelStyle = "text-red-100";
                            break;
                        case "green":
                            cardStyle = "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200 ring-2 ring-emerald-100 ring-offset-1";
                            countStyle = "text-white";
                            labelStyle = "text-emerald-100";
                            break;
                        case "orange":
                            cardStyle = "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200 ring-2 ring-orange-100 ring-offset-1";
                            countStyle = "text-white";
                            labelStyle = "text-orange-100";
                            break;
                        case "purple":
                            cardStyle = "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200 ring-2 ring-purple-100 ring-offset-1";
                            countStyle = "text-white";
                            labelStyle = "text-purple-100";
                            break;
                        case "neutral":
                        default:
                            cardStyle = "bg-neutral-900 border-neutral-900 text-white shadow-lg shadow-neutral-200 ring-2 ring-neutral-100 ring-offset-1";
                            countStyle = "text-white";
                            labelStyle = "text-neutral-400";
                            break;
                    }
                }

                return (
                    <button
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        className={clsx(
                            "flex flex-col items-start p-5 rounded-3xl border transition-all duration-300 text-left group relative overflow-hidden",
                            "active:scale-95 outline-none selection:bg-transparent",
                            cardStyle
                        )}
                    >
                        <span className={clsx("text-3xl font-bold tracking-tight mb-1 tabular-nums transition-colors", countStyle)}>
                            {item.count}
                        </span>
                        <span className={clsx("text-sm font-medium transition-colors", labelStyle)}>
                            {item.label}
                        </span>

                        {/* Subtle gloss effect for selected items */}
                        {isSelected && (
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
