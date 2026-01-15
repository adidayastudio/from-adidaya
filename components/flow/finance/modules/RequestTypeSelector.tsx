
import { useRef, useState, useEffect } from "react";
import { clsx } from "clsx";

export type RequestType = "PURCHASE" | "REIMBURSE";

// iOS Glass Toggle for Request Type Selection
export function RequestTypeSelector({
    activeType,
    onTypeChange
}: {
    activeType: RequestType;
    onTypeChange: (type: RequestType) => void;
}) {
    const purchaseRef = useRef<HTMLButtonElement>(null);
    const reimburseRef = useRef<HTMLButtonElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });

    useEffect(() => {
        const activeRef = activeType === "PURCHASE" ? purchaseRef : reimburseRef;
        if (activeRef.current) {
            setIndicatorStyle({
                width: activeRef.current.offsetWidth,
                left: activeRef.current.offsetLeft,
            });
        }
    }, [activeType]);

    return (
        <div
            className="relative inline-flex p-1 rounded-xl h-10 w-full"
            style={{
                background: 'rgba(0, 0, 0, 0.06)',
            }}
        >
            {/* Sliding indicator */}
            <div
                className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm transition-all duration-300 ease-out"
                style={{
                    width: `${indicatorStyle.width}px`,
                    left: `${indicatorStyle.left}px`,
                }}
            />

            {/* Buttons */}
            <button
                ref={purchaseRef}
                onClick={() => onTypeChange("PURCHASE")}
                className={clsx(
                    "relative z-10 flex-1 px-3 h-full rounded-lg text-sm font-medium transition-colors duration-200",
                    activeType === "PURCHASE"
                        ? "text-neutral-900"
                        : "text-neutral-500 hover:text-neutral-700"
                )}
            >
                Purchase
            </button>
            <button
                ref={reimburseRef}
                onClick={() => onTypeChange("REIMBURSE")}
                className={clsx(
                    "relative z-10 flex-1 px-3 h-full rounded-lg text-sm font-medium transition-colors duration-200",
                    activeType === "REIMBURSE"
                        ? "text-neutral-900"
                        : "text-neutral-500 hover:text-neutral-700"
                )}
            >
                Reimburse
            </button>
        </div>
    );
}
