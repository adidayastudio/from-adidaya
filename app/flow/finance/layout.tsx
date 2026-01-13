"use client";

import { FinanceProvider } from "@/components/flow/finance/FinanceContext";


export default function FinanceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <FinanceProvider>
            {children}
        </FinanceProvider>
    );
}
