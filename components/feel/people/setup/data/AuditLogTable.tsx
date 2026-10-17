"use client";

import { FileText } from "lucide-react";

const MOCK_LOGS = [
    { id: "1", action: "Updated Role Weighting", entity: "Performance > Weighting", user: "Admin User", timestamp: "2 mins ago" },
    { id: "2", action: "Added New Role", entity: "Structure > Frontend Dev", user: "HR Manager", timestamp: "1 hour ago" },
    { id: "3", action: "Changed Visibility", entity: "Access > Staff Scope", user: "Admin User", timestamp: "Yesterday" },
    { id: "4", action: "Archived Skill", entity: "Skills > jQuery", user: "Supervisor", timestamp: "2 days ago" },
];

export default function AuditLogTable() {
    return (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-500" />
                <h3 className="font-semibold text-neutral-900">Configuration Change Log</h3>
            </div>
            <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                        <th className="px-4 py-3 font-semibold text-neutral-700">Action</th>
                        <th className="px-4 py-3 font-semibold text-neutral-700">Entity</th>
                        <th className="px-4 py-3 font-semibold text-neutral-700">User</th>
                        <th className="px-4 py-3 font-semibold text-neutral-700 text-right">Timestamp</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                    {MOCK_LOGS.map((log) => (
                        <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-neutral-900">{log.action}</td>
                            <td className="px-4 py-3 text-neutral-600">
                                <span className="bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-xs break-all">
                                    {log.entity}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-neutral-600">{log.user}</td>
                            <td className="px-4 py-3 text-right text-neutral-400 text-xs">{log.timestamp}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
