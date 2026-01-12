"use client";

import { Button } from "@/shared/ui/primitives/button/button";
import { User, Mail, Shield, LogOut } from "lucide-react";

export function AccountSettings() {
    return (
        <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-lg font-bold text-neutral-900 mb-1">My Account</h2>
                <p className="text-sm text-neutral-500 mb-6">Manage your personal profile and preferences.</p>

                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center text-2xl font-bold text-neutral-400">
                            A
                        </div>
                        <div>
                            <Button variant="outline" size="sm" className="rounded-full text-xs">Change Avatar</Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Display Name</label>
                            <div className="relative">
                                <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                                <input
                                    type="text"
                                    defaultValue="Ardiansyah"
                                    className="w-full pl-10 p-3 rounded-lg border border-neutral-200 text-sm focus:ring-2 focus:ring-neutral-900 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                                <input
                                    type="email"
                                    defaultValue="ardi@adidaya.com"
                                    disabled
                                    className="w-full pl-10 p-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-sm font-bold text-neutral-900 mb-4">Security</h3>
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-neutral-900">Password</div>
                                <div className="text-xs text-neutral-500">Last changed 3 months ago</div>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-full">Update</Button>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-neutral-200">
                <button className="text-red-600 text-sm font-bold flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out from All Devices
                </button>
            </div>
        </div>
    );
}
