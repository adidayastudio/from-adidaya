"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { BeneficiaryAccount } from "@/lib/api/finance";

interface SearchableAccountSelectProps {
    accounts: BeneficiaryAccount[];
    onSelect: (account: BeneficiaryAccount) => void;
}

export function SearchableAccountSelect({ accounts, onSelect }: SearchableAccountSelectProps) {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const filtered = accounts.filter(a => {
        const q = query.toLowerCase();
        return (
            a.bank_name.toLowerCase().includes(q) ||
            a.account_number.toLowerCase().includes(q) ||
            a.account_name.toLowerCase().includes(q)
        );
    });

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1.5">
                Quick Select (Saved Accounts)
            </label>
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" strokeWidth={1.5} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Search by bank, number, or name..."
                    className="w-full h-10 pl-10 pr-8 text-sm border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/[0.08] focus:border-blue-500/20 transition-all font-medium"
                />
                {query && (
                    <button
                        onClick={() => { setQuery(""); setIsOpen(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {isOpen && filtered.length > 0 && (
                <div className="absolute z-[200] mt-1.5 w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-[200px] overflow-y-auto scrollbar-hide">
                    {filtered.map((acc) => (
                        <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                                onSelect(acc);
                                setQuery(`${acc.bank_name} - ${acc.account_name}`);
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors border-b border-neutral-100 dark:border-neutral-700/50 last:border-0"
                        >
                            <div className="text-sm font-bold text-neutral-900 dark:text-white">{acc.bank_name} - {acc.account_number}</div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{acc.account_name}</div>
                        </button>
                    ))}
                </div>
            )}

            {isOpen && query && filtered.length === 0 && (
                <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl px-4 py-3">
                    <p className="text-sm text-neutral-400 text-center">No matching accounts</p>
                </div>
            )}
        </div>
    );
}
