"use client";

import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { Checkbox } from "@/shared/ui/primitives/controls/checkbox";

interface FactorsTabProps {
    config?: any;
    onChange?: (config: any) => void;
}

export default function FactorsTab({ config = {}, onChange }: FactorsTabProps) {
    // Current factors list
    const factors = config?.factors || [
        { id: 1, name: "Location Factor (Regional)", scope: "global", default: "1.0", mandatory: true },
        { id: 2, name: "Difficulty Factor", scope: "project", default: "1.0", mandatory: false },
        { id: 3, name: "Inflation Adjustment", scope: "global", default: "1.02", mandatory: false }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-semibold text-neutral-900 border-b pb-2">Adjustment Factors</h3>

            <div className="overflow-visible border border-neutral-200 rounded-lg shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold text-neutral-700">Factor Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-neutral-700">Scope</th>
                            <th className="px-4 py-3 text-left font-semibold text-neutral-700 w-32">Default Value</th>
                            <th className="px-4 py-3 text-center font-semibold text-neutral-700 w-24">Mandatory</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 bg-white">
                        {factors.map((factor: any) => (
                            <tr key={factor.id} className="hover:bg-neutral-50">
                                <td className="px-4 py-3">
                                    <Input defaultValue={factor.name} className="h-8 text-sm" />
                                </td>
                                <td className="px-4 py-3">
                                    <Select
                                        options={[
                                            { label: "Global (All Projects)", value: "global" },
                                            { label: "Project Specific", value: "project" },
                                            { label: "Stage Specific", value: "stage" }
                                        ]}
                                        defaultValue={factor.scope}
                                        className="h-8 text-sm"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <Input type="number" defaultValue={factor.default} className="h-8 text-sm" />
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Checkbox defaultChecked={factor.mandatory} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="text-sm text-neutral-500 italic">
                * Factors are multipliers applied to the base cost.
            </p>
        </div>
    );
}
