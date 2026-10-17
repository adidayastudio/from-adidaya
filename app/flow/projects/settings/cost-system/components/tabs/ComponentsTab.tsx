"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

interface ComponentsTabProps {
    config?: any;
    onChange?: (config: any) => void;
}

export default function ComponentsTab({ config = {}, onChange }: ComponentsTabProps) {
    // Current state derived from config or defaults
    // Config structure: { "matrix": { "material": { "ballpark": true, ...}, ... } }
    const matrix = config?.matrix || {
        "material": { "ballpark": false, "estimates": true, "detail": true },
        "labor": { "ballpark": false, "estimates": true, "detail": true },
        "equipment": { "ballpark": false, "estimates": false, "detail": true },
        "overhead": { "ballpark": false, "estimates": false, "detail": true },
        "profit": { "ballpark": false, "estimates": false, "detail": true },
        "tax": { "ballpark": false, "estimates": false, "detail": true },
    };

    const toggleAvailability = (component: string, level: string) => {
        const componentRow = matrix[component] || {};
        const newRow = { ...componentRow, [level]: !componentRow[level] };
        const newMatrix = { ...matrix, [component]: newRow };
        onChange?.({ ...config, matrix: newMatrix });
    };

    const isAvailable = (component: string, level: string) => {
        return matrix[component]?.[level] || false;
    };

    // Components definition
    const components = [
        { id: "material", label: "Material Cost" },
        { id: "labor", label: "Labor / wages" },
        { id: "equipment", label: "Equipment / Tools" },
        { id: "overhead", label: "Overhead (Indirect)" },
        { id: "profit", label: "Profit Margin" },
        { id: "tax", label: "Tax (PPN/PPH)" },
    ];

    const pricingLevels = [
        { id: "ballpark", label: "Ballpark" },
        { id: "estimates", label: "Estimates" },
        { id: "detail", label: "Detail (AHSP)" },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* ... Header ... */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-900 border-b pb-2">Component Availability Matrix</h3>
                <p className="text-sm text-neutral-500">
                    Define which cost components are active for each pricing level.
                    Click to toggle availability.
                </p>

                <div className="overflow-hidden border border-neutral-200 rounded-lg shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 border-b border-neutral-200">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-neutral-700 w-1/3">Component</th>
                                {pricingLevels.map(level => (
                                    <th key={level.id} className="px-4 py-3 text-center font-semibold text-neutral-700 w-1/6">
                                        {level.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 bg-white">
                            {components.map((comp) => (
                                <tr key={comp.id} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-neutral-900">
                                        {comp.label}
                                    </td>
                                    {pricingLevels.map(level => {
                                        const active = isAvailable(comp.id, level.id);
                                        return (
                                            <td key={level.id} className="px-4 py-3 text-center">
                                                <div
                                                    className={`
                                                        mx-auto cursor-pointer rounded-md w-8 h-8 flex items-center justify-center transition-all duration-200
                                                        ${active
                                                            ? "bg-green-100 text-green-600 ring-1 ring-green-200 scale-100"
                                                            : "bg-neutral-100 text-neutral-400 scale-100 hover:bg-neutral-200"
                                                        }
                                                    `}
                                                    onClick={() => toggleAvailability(comp.id, level.id)}
                                                >
                                                    {active ? <Check size={16} strokeWidth={3} /> : <X size={16} />}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
