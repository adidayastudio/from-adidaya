"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Check, X, Save } from "lucide-react";

interface PermissionRow {
    role: string;
    viewPeople: boolean;
    managePeople: boolean;
    approveRequests: boolean;
    viewPerformance: boolean;
    manageSettings: boolean;
}

const MOCK_PERMISSIONS: PermissionRow[] = [
    { role: "Admin", viewPeople: true, managePeople: true, approveRequests: true, viewPerformance: true, manageSettings: true },
    { role: "Supervisor", viewPeople: true, managePeople: false, approveRequests: true, viewPerformance: true, manageSettings: false },
    { role: "Staff", viewPeople: true, managePeople: false, approveRequests: false, viewPerformance: false, manageSettings: false },
];

export default function RolePermissionsMatrix() {
    const [permissions, setPermissions] = useState<PermissionRow[]>(MOCK_PERMISSIONS);

    const togglePermission = (index: number, key: keyof PermissionRow) => {
        if (key === 'role') return;
        const newPermissions = [...permissions];
        // @ts-ignore
        newPermissions[index][key] = !newPermissions[index][key];
        setPermissions(newPermissions);
    };

    return (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-neutral-200 flex justify-between items-center bg-neutral-50/50">
                <div>
                    <h3 className="font-semibold text-neutral-900">Role Capabilities</h3>
                    <p className="text-xs text-neutral-500">Define what each role can do within the People module.</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs" icon={<Save className="w-3 h-3" />}>
                    Save Changes
                </Button>
            </div>
            <table className="w-full text-center text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                        <th className="px-4 py-3 font-semibold text-neutral-700 text-left">Role</th>
                        <th className="px-4 py-3 font-semibold text-neutral-700 w-32">View Directory</th>
                        <th className="px-4 py-3 font-semibold text-neutral-700 w-32">Manage People</th>
                        <th className="px-4 py-3 font-semibold text-neutral-700 w-32">Approve Requests</th>
                        <th className="px-4 py-3 font-semibold text-neutral-700 w-32">View Performance</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                    {permissions.map((row, idx) => (
                        <tr key={row.role} className="hover:bg-neutral-50 transition-colors">
                            <td className="px-4 py-3 font-bold text-neutral-900 text-left">{row.role}</td>
                            <td className="px-4 py-3">
                                <button
                                    onClick={() => togglePermission(idx, 'viewPeople')}
                                    className={`w-6 h-6 rounded border flex items-center justify-center mx-auto transition-colors ${row.viewPeople ? "bg-green-500 border-green-600 text-white" : "bg-white border-neutral-300 text-transparent"
                                        }`}
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            </td>
                            <td className="px-4 py-3">
                                <button
                                    onClick={() => togglePermission(idx, 'managePeople')}
                                    className={`w-6 h-6 rounded border flex items-center justify-center mx-auto transition-colors ${row.managePeople ? "bg-green-500 border-green-600 text-white" : "bg-white border-neutral-300 text-transparent"
                                        }`}
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            </td>
                            <td className="px-4 py-3">
                                <button
                                    onClick={() => togglePermission(idx, 'approveRequests')}
                                    className={`w-6 h-6 rounded border flex items-center justify-center mx-auto transition-colors ${row.approveRequests ? "bg-green-500 border-green-600 text-white" : "bg-white border-neutral-300 text-transparent"
                                        }`}
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            </td>
                            <td className="px-4 py-3">
                                <button
                                    onClick={() => togglePermission(idx, 'viewPerformance')}
                                    className={`w-6 h-6 rounded border flex items-center justify-center mx-auto transition-colors ${row.viewPerformance ? "bg-green-500 border-green-600 text-white" : "bg-white border-neutral-300 text-transparent"
                                        }`}
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
