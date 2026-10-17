"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Save } from "lucide-react";

export function GeneralSettings() {
    return (
        <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-lg font-bold text-neutral-900 mb-1">Organization Details</h2>
                <p className="text-sm text-neutral-500 mb-6">Global identity and format settings for the organization.</p>

                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Organization Name</label>
                            <input
                                type="text"
                                defaultValue="Adidaya Group"
                                className="w-full p-3 rounded-lg border border-neutral-200 text-sm focus:ring-2 focus:ring-neutral-900 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Legal Name</label>
                            <input
                                type="text"
                                defaultValue="PT Adidaya Persada Indonesia"
                                className="w-full p-3 rounded-lg border border-neutral-200 text-sm focus:ring-2 focus:ring-neutral-900 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Fiscal Year Start</label>
                            <select className="w-full p-3 rounded-lg border border-neutral-200 text-sm bg-white outline-none">
                                <option>January</option>
                                <option>April</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Timezone</label>
                            <select className="w-full p-3 rounded-lg border border-neutral-200 text-sm bg-white outline-none">
                                <option>(GMT+07:00) Bangkok, Hanoi, Jakarta</option>
                                <option>(GMT+08:00) Singapore, Perth</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-neutral-200">
                <Button className="!rounded-full px-6 bg-neutral-900 text-white" icon={<Save className="w-4 h-4" />}>
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
