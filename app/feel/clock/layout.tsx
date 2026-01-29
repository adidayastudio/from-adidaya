"use client";

import { ClockProvider } from "@/components/feel/clock/ClockContext";

export default function ClockLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClockProvider>
            {children}
        </ClockProvider>
    );
}
