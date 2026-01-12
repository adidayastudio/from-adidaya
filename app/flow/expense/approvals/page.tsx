"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import ExpenseSidebar from "@/components/flow/expense/ExpenseSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";

export default function ExpenseApprovalsPage() {
    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Expense" }, { label: "Approvals" }]} />
            <PageWrapper sidebar={<ExpenseSidebar />}>
                <div className="p-4">
                    <h1 className="text-2xl font-bold text-neutral-900">Expense Approvals</h1>
                    <p className="text-neutral-500 mt-1">Review and approve expense requests.</p>
                    <div className="mt-8 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4"><span className="text-2xl">🚧</span></div>
                        <h3 className="text-lg font-medium text-neutral-900">Work in Progress</h3>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
