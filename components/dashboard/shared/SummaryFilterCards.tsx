import React, { useRef, useEffect } from "react";
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
    isScrollable?: boolean;
}

export function SummaryFilterCards({ items, selectedId, onSelect, className, isScrollable = false }: SummaryFilterCardsProps) {
    const cardRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

    useEffect(() => {
        if (isScrollable && selectedId && cardRefs.current[selectedId]) {
            cardRefs.current[selectedId]?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "center"
            });
        }
    }, [selectedId, isScrollable]);

    return (
        <div className={clsx(
            isScrollable
                ? "flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-4 pb-4 -mb-4 w-full"
                : "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4",
            className
        )}>
            {items.map((item) => {
                const isSelected = selectedId === item.id;

                // Define color styles based on selection state and item color
                // DEFAULT / UNSELECTED: Glassy look
                let cardStyle = "bg-white/40 dark:bg-black/30 backdrop-blur-md border-white/40 dark:border-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-white/60 dark:hover:bg-black/40";
                let countStyle = "text-neutral-900 dark:text-white";
                let labelStyle = "text-neutral-500 dark:text-neutral-400";

                if (isSelected) {
                    switch (item.color) {
                        case "blue":
                            cardStyle = "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/10 ring-offset-1";
                            countStyle = "text-white";
                            labelStyle = "text-blue-100";
                            break;
                        case "red":
                            cardStyle = "bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/20 ring-2 ring-red-500/10 ring-offset-1";
                            countStyle = "text-white";
                            labelStyle = "text-red-100";
                            break;
                        case "green":
                            cardStyle = "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/10 ring-offset-1";
                            countStyle = "text-white";
                            labelStyle = "text-emerald-100";
                            break;
                        case "orange":
                            cardStyle = "bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-500/20 ring-2 ring-orange-500/10 ring-offset-1";
                            countStyle = "text-white";
                            labelStyle = "text-orange-100";
                            break;
                        case "purple":
                            cardStyle = "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20 ring-2 ring-purple-500/10 ring-offset-1";
                            countStyle = "text-white";
                            labelStyle = "text-purple-100";
                            break;
                        case "neutral":
                        default:
                            cardStyle = "bg-neutral-900 dark:bg-white dark:text-black border-neutral-800 dark:border-white text-white shadow-lg shadow-neutral-500/10 ring-2 ring-neutral-500/5 ring-offset-1";
                            countStyle = "text-white dark:text-black";
                            labelStyle = "text-neutral-400 dark:text-neutral-500";
                            break;
                    }
                }

                return (
                    <button
                        key={item.id}
                        ref={(el) => { cardRefs.current[item.id] = el; }}
                        onClick={() => onSelect(item.id)}
                        className={clsx(
                            "flex flex-col items-start p-5 rounded-3xl border transition-all duration-300 text-left group relative overflow-hidden",
                            "active:scale-95 outline-none selection:bg-transparent",
                            isScrollable && "flex-1 min-w-[140px] md:min-w-[180px] lg:min-w-[200px] shrink-0 snap-start",
                            cardStyle
                        )}
                    >
                        <span className={clsx("text-3xl font-bold tracking-tight mb-1 tabular-nums transition-colors", countStyle)}>
                            {item.count}
                        </span>
                        <span className={clsx("text-sm font-medium transition-colors", labelStyle)}>
                            {item.label}
                        </span>

                        {/* Subtle gloss effect overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {isSelected && (
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
