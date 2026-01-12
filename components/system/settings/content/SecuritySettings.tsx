"use client";

import { Shield, Fingerprint, History } from "lucide-react";

export function SecuritySettings() {
    return (
        <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-lg font-bold text-neutral-900 mb-1">Security & Policy</h2>
                <p className="text-sm text-neutral-500 mb-6">Configure organization-wide security protocols.</p>

                <div className="space-y-6">
                    {/* Password Policy */}
                    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h3 className="font-bold text-neutral-900">Password Policy</h3>
                                    <p className="text-sm text-neutral-500">Rules for user password complexity.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                                        <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                                        <span className="text-sm font-medium text-neutral-700">Require specific character types (uppercase, number, symbol)</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                                        <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                                        <span className="text-sm font-medium text-neutral-700">Enforce 90-day password rotation</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Session */}
                    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                <Fingerprint className="w-6 h-6" />
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h3 className="font-bold text-neutral-900">Session Management</h3>
                                    <p className="text-sm text-neutral-500">Control login session duration.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Idle Timeout</label>
                                        <select className="w-full p-2.5 rounded-lg border border-neutral-200 text-sm bg-white outline-none">
                                            <option>15 Minutes</option>
                                            <option>30 Minutes</option>
                                            <option>1 Hour</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Max Session Length</label>
                                        <select className="w-full p-2.5 rounded-lg border border-neutral-200 text-sm bg-white outline-none">
                                            <option>24 Hours</option>
                                            <option>7 Days</option>
                                            <option>30 Days</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center justify-between">
                <div className="text-sm text-red-800">
                    <strong>Critical Zone:</strong> Changes here affect all users immediately.
                </div>
            </div>
        </div>
    );
}
