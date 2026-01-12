"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import FinanceSidebar from "@/components/flow/finance/FinanceSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Search, Plus, PieChart, Eye } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";

const MOCK_BUDGETS = [
    { id: "BUD-001", project: "Rumah Pak Budi", category: "Materials", allocated: 150000000, spent: 112000000, remaining: 38000000 },
    { id: "BUD-002", project: "Villa Puncak", category: "Labor", allocated: 80000000, spent: 45000000, remaining: 35000000 },
    { id: "BUD-003", project: "Renovasi Kantor", category: "Equipment", allocated: 25000000, spent: 22000000, remaining: 3000000 },
];

function formatShort(n: number) { return n >= 1000000 ? `${(n / 1000000).toFixed(0)}M` : `${n}`; }
function getProgress(spent: number, allocated: number) { return Math.min(100, Math.round((spent / allocated) * 100)); }

export default function BudgetPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Finance" }, { label: "Budget" }]} />
            <PageWrapper sidebar={<FinanceSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div><h1 className="text-2xl font-bold text-neutral-900">Budget</h1><p className="text-sm text-neutral-500 mt-1">Manage project budgets and allocations.</p></div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="flex justify-between gap-4">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search budgets..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64" /></div>
                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"><Plus className="w-4 h-4" /> Add Budget</button>
                    </div>

                    <div className="space-y-4">
                        {MOCK_BUDGETS.map((b) => {
                            const progress = getProgress(b.spent, b.allocated);
                            const isOverBudget = progress > 90;
                            return (
                                <div key={b.id} className="bg-white rounded-xl border p-5 hover:border-red-200 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <div><div className="font-semibold">{b.project}</div><div className="text-sm text-neutral-500">{b.category}</div></div>
                                        <button className="p-2 hover:bg-neutral-100 rounded-lg"><Eye className="w-4 h-4 text-neutral-500" /></button>
                                    </div>
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="flex-1 h-3 bg-neutral-100 rounded-full overflow-hidden"><div className={clsx("h-full rounded-full", isOverBudget ? "bg-red-500" : "bg-green-500")} style={{ width: `${progress}%` }} /></div>
                                        <span className={clsx("text-sm font-medium", isOverBudget ? "text-red-600" : "text-green-600")}>{progress}%</span>
                                    </div>
                                    <div className="grid grid-cols-3 text-sm">
                                        <div><div className="text-neutral-500">Allocated</div><div className="font-medium">{formatShort(b.allocated)}</div></div>
                                        <div><div className="text-neutral-500">Spent</div><div className="font-medium">{formatShort(b.spent)}</div></div>
                                        <div><div className="text-neutral-500">Remaining</div><div className={clsx("font-medium", b.remaining < 5000000 ? "text-red-600" : "")}>{formatShort(b.remaining)}</div></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </PageWrapper>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Add Budget" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Project" required><FormSelect><option value="">Select project...</option><option>Rumah Pak Budi</option><option>Villa Puncak</option><option>Renovasi Kantor</option></FormSelect></FormField>
                    <FormField label="Budget Category" required><FormSelect><option value="">Select category...</option><option>Materials</option><option>Labor</option><option>Equipment</option><option>Transport</option><option>Utilities</option><option>Contingency</option><option>Other</option></FormSelect></FormField>
                    <FormField label="Allocated Amount (IDR)" required><FormInput type="number" placeholder="0" /></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Start Date"><FormInput type="date" /></FormField>
                        <FormField label="End Date"><FormInput type="date" /></FormField>
                    </div>
                    <FormField label="Description"><FormTextarea placeholder="Budget description..." /></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Add Budget" />
                </form>
            </Drawer>
        </div>
    );
}
