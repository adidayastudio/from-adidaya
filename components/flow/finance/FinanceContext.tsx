"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type ViewMode = "personal" | "team";

interface FinanceContextType {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
    const [viewMode, setViewMode] = useState<ViewMode>("personal");

    return (
        <FinanceContext.Provider value={{ viewMode, setViewMode }}>
            {children}
        </FinanceContext.Provider>
    );
}

export function useFinance() {
    const context = useContext(FinanceContext);
    if (context === undefined) {
        throw new Error("useFinance must be used within a FinanceProvider");
    }
    return context;
}
