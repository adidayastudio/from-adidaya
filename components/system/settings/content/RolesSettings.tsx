"use client";

import { Shield, Check, X } from "lucide-react";

export function RolesSettings() {
    return (
        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-neutral-900 mb-1">Roles & Permissions</h2>
                    <p className="text-sm text-neutral-500">Define access tiers for the organization.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    { name: "Super Admin", desc: "Full access to all systems and settings.", color: "bg-red-50 text-red-700 border-red-200", users: 1 },
                    { name: "HR Manager", desc: "Manage people, payroll, and culture.", color: "bg-purple-50 text-purple-700 border-purple-200", users: 2 },
                    { name: "Project Manager", desc: "Manage projects, tasks, and budgets.", color: "bg-blue-50 text-blue-700 border-blue-200", users: 5 },
                    { name: "Staff", desc: "Standard access to Flow and Feel.", color: "bg-neutral-50 text-neutral-700 border-neutral-200", users: 42 },
                ].map((role) => (
                    <div key={role.name} className={`p-6 rounded-2xl border ${role.color.split(' ')[2]} bg-white shadow-sm flex flex-col h-full`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${role.color}`}>
                            <Shield className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-neutral-900 mb-2">{role.name}</h3>
                        <p className="text-sm text-neutral-500 mb-4 flex-grow">{role.desc}</p>
                        <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs font-medium text-neutral-400">
                            <span>{role.users} Active Users</span>
                            <button className="text-neutral-900 hover:underline">Edit</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
