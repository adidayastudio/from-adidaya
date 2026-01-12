"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import ExpenseSidebar from "@/components/flow/expense/ExpenseSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";

export default function PaymentsPage() {
    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb
                items={[
                    { label: "Flow" },
                    { label: "Expense" },
                    { label: "Payments" },
                ]}
            />

            <PageWrapper sidebar={<ExpenseSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    {/* HEADER */}
                    <div className="space-y-4">
                        <div>
                            <h1 className="text-2xl font-bold text-neutral-900">Payments</h1>
                            <p className="text-sm text-neutral-500 mt-1">Transfer proofs and completed payments.</p>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    {/* CONTENT PLACEHOLDER */}
                    <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl">🚧</span>
                        </div>
                        <h3 className="text-lg font-medium text-neutral-900">Work in Progress</h3>
                        <p className="text-neutral-500 max-w-sm mt-2">
                            Will include: Payment List (Date, Project, Amount, Method, Proof, Linked Expense). Source of truth for actual cost.
                        </p>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
