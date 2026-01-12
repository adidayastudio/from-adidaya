"use client";

import { useMemo } from "react";
import { RABItem } from "./types/rab.types";
import RABDetailSummaryNode from "./RABDetailSummaryNode";

type Props = {
    items: RABItem[];
};

export default function RABDetailSummaryTable({ items }: Props) {
    // Calculate Total Project Cost (Sum of Roots)
    const totalProjectCost = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.total || 0), 0);
    }, [items]);

    return (
        <div className="w-full text-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
            <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-neutral-50 z-10">
                    <tr className="border-b border-neutral-200 text-neutral-500 font-medium">
                        <th className="w-8 py-3" />
                        <th className="py-3 text-left w-24">Code</th>
                        <th className="py-3 text-left">Item</th>
                        <th className="py-3 text-right w-32">Total Cost</th>
                        <th className="py-3 text-right w-20">Weight</th>
                    </tr>
                </thead>
                <tbody>
                    {/* TOTAL ROW */}
                    <tr className="border-b border-neutral-200 font-semibold bg-neutral-50/50">
                        <td className="py-3" />
                        <td className="py-3 font-mono text-neutral-900">Total</td>
                        <td className="py-3 text-neutral-900">Project Cost</td>
                        <td className="py-3 text-right text-neutral-900">
                            Rp {Math.round(totalProjectCost).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 text-right text-neutral-900">100.00%</td>
                    </tr>

                    {/* ROOT ITEMS (L0) */}
                    {items.map((item) => (
                        <RABDetailSummaryNode
                            key={item.code}
                            item={item}
                            totalProject={totalProjectCost}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
