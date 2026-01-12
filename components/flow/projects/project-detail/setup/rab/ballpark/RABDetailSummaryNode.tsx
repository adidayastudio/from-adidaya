"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { RABItem } from "./types/rab.types";

type Props = {
    item: RABItem;
    totalProject: number;
};

export default function RABDetailSummaryNode({ item, totalProject }: Props) {
    // L0 is collapsible. L1 is leaf (in this view).
    const isL0 = !item.code.includes("."); // Rough check or pass level
    const hasChildren = item.children && item.children.length > 0;

    // Default open for L0? User said "parent ttep bisa dicollapse dan expand".
    // Let's default to OPEN.
    const [open, setOpen] = useState(true);

    // Calculate row total
    const rowTotal = item.total || 0;
    const weight = totalProject > 0 ? (rowTotal / totalProject) * 100 : 0;

    return (
        <>
            <tr className={`border-b border-neutral-100 last:border-0 hover:bg-neutral-50 ${isL0 ? "bg-neutral-50/50 font-semibold" : ""}`}>
                {/* CHEVRON (Only for L0) */}
                <td className="py-2">
                    {isL0 && hasChildren && (
                        <button
                            onClick={() => setOpen(!open)}
                            className="flex items-center justify-center h-full w-full text-neutral-500 hover:text-neutral-700"
                        >
                            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                    )}
                </td>

                {/* CODE */}
                <td className="py-2">
                    <div
                        className={`flex items-center justify-center border text-[10px] font-bold ${isL0
                                ? "w-7 h-7 rounded-full border-neutral-300 bg-neutral-100 text-neutral-600"
                                : "w-6 h-6 rounded-full border-neutral-200 bg-neutral-50 text-neutral-500"
                            }`}
                    >
                        {item.code}
                    </div>
                </td>

                {/* NAME */}
                <td className="py-2">
                    <div className="leading-tight">
                        <div className="text-neutral-900">{item.nameEn}</div>
                        {item.nameId && <div className="italic text-neutral-400">{item.nameId}</div>}
                    </div>
                </td>

                {/* EMPTY COLS (If needed to match breakdown layout, but this is Summary) */}
                {/* Summary usually simpler: Name | Total | Weight */}

                {/* TOTAL */}
                <td className="py-2 text-right text-neutral-900">
                    Rp {Math.round(rowTotal).toLocaleString("id-ID")}
                </td>

                {/* WEIGHT */}
                <td className="py-2 text-right text-neutral-600">
                    {weight.toFixed(2)}%
                </td>
            </tr>

            {/* CHILDREN (L1 only) */}
            {isL0 && open && hasChildren && (
                <>
                    {item.children!.map((child) => (
                        <RABDetailSummaryNode
                            key={child.code}
                            item={child}
                            totalProject={totalProject}
                        />
                    ))}
                </>
            )}
        </>
    );
}
