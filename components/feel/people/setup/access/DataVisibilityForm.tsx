"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Save, Eye, EyeOff, Users, Lock } from "lucide-react";

export default function DataVisibilityForm() {
    return (
        <div className="max-w-3xl mx-auto space-y-6">

            {/* Staff Scope */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-neutral-900">Staff Visibility Scope</h3>
                        <p className="text-sm text-neutral-500 mb-4">Control what regular staff members can see in the directory.</p>

                        <div className="space-y-3">
                            <label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                                <input type="radio" name="staff_scope" className="text-blue-600 focus:ring-blue-500" defaultChecked />
                                <div>
                                    <span className="block font-medium text-neutral-900">Public Profile Only</span>
                                    <span className="text-xs text-neutral-500">Can only view Name, Title, and Department of colleagues.</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                                <input type="radio" name="staff_scope" className="text-blue-600 focus:ring-blue-500" />
                                <div>
                                    <span className="block font-medium text-neutral-900">Full Profile (Read-Only)</span>
                                    <span className="text-xs text-neutral-500">Can view Skills, Interests, and Availability. Performance data remains hidden.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Supervisor Scope */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Lock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-neutral-900">Supervisor Visibility Scope</h3>
                        <p className="text-sm text-neutral-500 mb-4">Control cross-department visibility for supervisors.</p>

                        <div className="space-y-3">
                            <label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                                <input type="radio" name="supervisor_scope" className="text-indigo-600 focus:ring-indigo-500" defaultChecked />
                                <div>
                                    <span className="block font-medium text-neutral-900">Team Only</span>
                                    <span className="text-xs text-neutral-500">Can only view detailed data for members in their own department.</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                                <input type="radio" name="supervisor_scope" className="text-indigo-600 focus:ring-indigo-500" />
                                <div>
                                    <span className="block font-medium text-neutral-900">Cross-Team (Global)</span>
                                    <span className="text-xs text-neutral-500">Can view detailed data for all staff across the organization.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" icon={<Save className="w-4 h-4" />}>
                    Save Visibility Rules
                </Button>
            </div>
        </div>
    );
}
