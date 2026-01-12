"use client";

import { Users, MoreVertical, Plus, Search } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";

const MOCK_USERS = [
    { id: 1, name: "Ardiansyah", role: "Super Admin", email: "ardi@adidaya.com", status: "Active" },
    { id: 2, name: "Siti Rahayu", role: "HR Manager", email: "siti@adidaya.com", status: "Active" },
    { id: 3, name: "Budi Santoso", role: "Staff", email: "budi@adidaya.com", status: "Active" },
    { id: 4, name: "Dewi Lestari", role: "Staff", email: "dewi@adidaya.com", status: "On Leave" },
];

export function TeamSettings() {
    return (
        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-neutral-900 mb-1">Team Management</h2>
                    <p className="text-sm text-neutral-500">Manage users, invites, and access roles.</p>
                </div>
                <Button className="!rounded-full bg-neutral-900 text-white" icon={<Plus className="w-4 h-4" />}>
                    Invite User
                </Button>
            </div>

            <div className="flex items-center bg-white border border-neutral-200 rounded-xl px-4 py-2 w-full md:w-80 shadow-sm">
                <Search className="w-4 h-4 text-neutral-400 mr-2" />
                <input
                    type="text"
                    placeholder="Search users..."
                    className="flex-1 text-sm outline-none text-neutral-900 placeholder:text-neutral-400"
                />
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-neutral-100 bg-neutral-50/50">
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">User</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Role</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {MOCK_USERS.map((user) => (
                            <tr key={user.id} className="group hover:bg-neutral-50/50 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-neutral-600 text-xs">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-neutral-900">{user.name}</div>
                                            <div className="text-xs text-neutral-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'
                                            }`} />
                                        {user.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
