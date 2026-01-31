"use client";

import { useState } from "react";
import { AlertTriangle, Lock } from "lucide-react";

export default function LockDataPanel() {
    const [locks, setLocks] = useState({
        roles: false,
        departments: false,
        levels: true
    });

    const toggleLock = (key: keyof typeof locks) => {
        setLocks(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                    <h4 className="font-bold text-amber-900 text-sm">Caution: Locking Data</h4>
                    <p className="text-xs text-amber-800 mt-1">
                        Locking structure data prevents any modifications or deletions.
                        This is useful to prevent accidental changes that could break active project assignments or historical reports.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <div className="divide-y divide-neutral-100">
                    <div className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-medium text-neutral-900">Lock Roles</h4>
                                {locks.roles && <Lock className="w-3 h-3 text-red-500" />}
                            </div>
                            <p className="text-xs text-neutral-500">Prevent adding, renaming, or archiving roles.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={locks.roles} onChange={() => toggleLock('roles')} />
                            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none ring-offset-white peer-focus:ring-2 peer-focus:ring-blue-500/20 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-medium text-neutral-900">Lock Departments</h4>
                                {locks.departments && <Lock className="w-3 h-3 text-red-500" />}
                            </div>
                            <p className="text-xs text-neutral-500">Prevent changing department hierarchy.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={locks.departments} onChange={() => toggleLock('departments')} />
                            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none ring-offset-white peer-focus:ring-2 peer-focus:ring-blue-500/20 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-medium text-neutral-900">Lock Levels & Grades</h4>
                                {locks.levels && <Lock className="w-3 h-3 text-red-500" />}
                            </div>
                            <p className="text-xs text-neutral-500">Prevent changes to seniority levels (Critical for payroll).</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={locks.levels} onChange={() => toggleLock('levels')} />
                            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none ring-offset-white peer-focus:ring-2 peer-focus:ring-blue-500/20 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
