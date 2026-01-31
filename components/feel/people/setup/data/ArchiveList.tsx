"use client";

import { useState } from "react";
import { History, RefreshCw, Trash2 } from "lucide-react";

const MOCK_ARCHIVED = [
    { id: "1", type: "Role", name: "Intern", archivedAt: "2026-01-15", archivedBy: "John Doe" },
    { id: "2", type: "Department", name: "Legacy Ops", archivedAt: "2025-12-10", archivedBy: "Alice Manager" },
    { id: "3", type: "Skill", name: "Flash ActionScript", archivedAt: "2025-11-05", archivedBy: "Admin" },
];

export default function ArchiveList() {
    const [archivedItems, setArchivedItems] = useState(MOCK_ARCHIVED);

    return (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center gap-2">
                <History className="w-4 h-4 text-neutral-500" />
                <h3 className="font-semibold text-neutral-900">Archived Items</h3>
            </div>
            <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                        <th className="px-4 py-3 font-semibold text-neutral-700">Item Name</th>
                        <th className="px-4 py-3 font-semibold text-neutral-700">Type</th>
                        <th className="px-4 py-3 font-semibold text-neutral-700">Archived Date</th>
                        <th className="px-4 py-3 font-semibold text-neutral-700">Archived By</th>
                        <th className="px-4 py-3 font-semibold text-neutral-700 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                    {archivedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-neutral-900">{item.name}</td>
                            <td className="px-4 py-3">
                                <span className="px-2 py-0.5 bg-neutral-100 rounded text-xs text-neutral-600 border border-neutral-200">
                                    {item.type}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-neutral-600">{item.archivedAt}</td>
                            <td className="px-4 py-3 text-neutral-600">{item.archivedBy}</td>
                            <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                    <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                                        <RefreshCw className="w-3 h-3" /> Restore
                                    </button>
                                    <button className="text-neutral-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors" title="Delete Permanently">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {archivedItems.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-neutral-400 italic">No archived items found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
